import {
    BadRequestException,
    Injectable,
    Logger,
    NotFoundException,
    ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, MoreThan, Repository } from 'typeorm';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import {
    PaymentEventType,
    PaymentLogType,
    PaymentProvider,
    PaymentStatus,
} from '../../common/entities/enums/all.enums';
import { DEFAULT_MESSAGES } from '../../common/constants/default-messages';
import { Order } from '../orders/entities/order.entity';
import { InitiatePushPaymentDto } from './dto/initiate-push-payment.dto';
import { PaymentAttemptResponseDto } from './dto/payment-attempt-response.dto';
import { WAAFI_DEFAULT_PAYMENT_METHOD, WAAFI_IDEMPOTENCY_WINDOW_MS } from './constants/waafi.constants';
import { Payment } from './entities/payment.entity';
import { PaymentEvent } from './entities/payment-event.entity';
import { PaymentLog } from './entities/payment-log.entity';
import { mapWaafiResponse } from './waafi-response.mapper';
import { WaafiPaymentClientService } from './waafi-payment-client.service';

export type PaymentProcessingResult = {
    payment: Payment;
    providerStatusCode: number | null;
    normalizedMessage: string;
    canRetry: boolean;
    idempotent: boolean;
};

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);

    constructor(
        @InjectRepository(Payment)
        private readonly paymentsRepository: Repository<Payment>,
        @InjectRepository(PaymentLog)
        private readonly paymentLogsRepository: Repository<PaymentLog>,
        @InjectRepository(PaymentEvent)
        private readonly paymentEventsRepository: Repository<PaymentEvent>,
        @InjectRepository(Order)
        private readonly ordersRepository: Repository<Order>,
        private readonly dataSource: DataSource,
        private readonly configService: ConfigService,
        private readonly waafiPaymentClientService: WaafiPaymentClientService,
    ) { }

    async initializePayment(
        orderId: string,
        userId: string,
        initiatePaymentDto: InitiatePushPaymentDto,
    ): Promise<ApiResponseDto<PaymentAttemptResponseDto>> {
        const order = await this.ordersRepository.findOne({ where: { id: orderId, user_id: userId } });
        if (!order) {
            throw new NotFoundException(DEFAULT_MESSAGES.ORDER.NOT_FOUND);
        }

        const result = await this.submitWaafiPushPayment(order, userId, initiatePaymentDto);

        return ApiResponseDto.success(
            result.normalizedMessage,
            PaymentAttemptResponseDto.fromEntity(result.payment, result.normalizedMessage, result.canRetry),
            {
                providerStatusCode: result.providerStatusCode,
                idempotent: result.idempotent,
            },
        );
    }

    async submitWaafiPushPayment(
        order: Order,
        userId: string,
        initiatePaymentDto: InitiatePushPaymentDto,
    ): Promise<PaymentProcessingResult> {
        const provider = initiatePaymentDto.payment_provider ?? PaymentProvider.WAAFI;
        if (provider !== PaymentProvider.WAAFI) {
            throw new BadRequestException('Only WAAFI push payments are supported by this integration.');
        }

        const waafiConfig = this.configService.get('payments.waafi');
        if (!waafiConfig?.enabled) {
            throw new ServiceUnavailableException('WAAFI payments are not enabled.');
        }

        const reusablePayment = await this.findReusablePayment(order.id, provider, initiatePaymentDto);
        if (reusablePayment) {
            return {
                payment: reusablePayment,
                providerStatusCode: null,
                normalizedMessage: this.getFriendlyStatusMessage(reusablePayment.status),
                canRetry: this.isRetryableStatus(reusablePayment.status),
                idempotent: true,
            };
        }

        const payment = await this.createPaymentAttempt(order, userId, initiatePaymentDto);
        const requestPayload = this.waafiPaymentClientService.buildPayload({
            requestId: payment.request_id!,
            accountNo: initiatePaymentDto.account_no,
            amount: Number((order.total_amount_minor / 100).toFixed(2)),
            currency: payment.currency_code,
            referenceId: payment.reference_id!,
            invoiceId: payment.invoice_id!,
            description: payment.description!,
        });

        await this.persistRequestLog(payment.id, requestPayload);

        try {
            const providerResponse = await this.waafiPaymentClientService.pushPayment(requestPayload);
            const mapped = mapWaafiResponse(providerResponse.body, providerResponse.statusCode);

            const updatedPayment = await this.dataSource.transaction(async (manager) => {
                const lockedPayment = await manager.findOne(Payment, {
                    where: { id: payment.id },
                    lock: { mode: 'pessimistic_write' },
                });

                if (!lockedPayment) {
                    throw new NotFoundException('Payment attempt not found.');
                }

                lockedPayment.status = mapped.status;
                lockedPayment.provider_status = mapped.providerStatus;
                lockedPayment.provider_response_code = mapped.providerResponseCode ?? null;
                lockedPayment.provider_error_code = mapped.providerErrorCode ?? null;
                lockedPayment.provider_transaction_id = mapped.providerTransactionId ?? null;
                lockedPayment.issuer_transaction_id = mapped.issuerTransactionId ?? null;
                lockedPayment.reference_id = mapped.referenceId ?? lockedPayment.reference_id;
                lockedPayment.account_no_masked = mapped.accountNoMasked ?? lockedPayment.account_no_masked;
                lockedPayment.mobile_money_number = mapped.accountNoMasked ?? lockedPayment.mobile_money_number;
                lockedPayment.provider_request = requestPayload;
                lockedPayment.provider_response = providerResponse.body;
                lockedPayment.raw_response = providerResponse.body;
                lockedPayment.provider_reference = mapped.referenceId ?? payment.reference_id;
                lockedPayment.payment_method = initiatePaymentDto.payment_method ?? WAAFI_DEFAULT_PAYMENT_METHOD;
                lockedPayment.provider_payment_method = waafiConfig.paymentMethod;
                lockedPayment.failure_reason =
                    mapped.status === PaymentStatus.CONFIRMED ? null : mapped.providerDescription ?? mapped.message;
                lockedPayment.failed_at =
                    mapped.status === PaymentStatus.CONFIRMED ? null : new Date();
                lockedPayment.paid_at =
                    mapped.status === PaymentStatus.CONFIRMED ? new Date() : lockedPayment.paid_at;
                lockedPayment.metadata = {
                    ...lockedPayment.metadata,
                    provider_status_code: providerResponse.statusCode,
                    provider_response_id: providerResponse.body?.responseId ?? null,
                    waafi_order_id: providerResponse.body?.params?.orderId ?? null,
                    waafi_description: mapped.providerDescription ?? null,
                };

                const savedPayment = await manager.save(Payment, lockedPayment);

                await manager.save(PaymentLog, this.paymentLogsRepository.create({
                    payment_id: savedPayment.id,
                    type: PaymentLogType.RESPONSE,
                    endpoint: waafiConfig.baseUrl,
                    request_payload: requestPayload,
                    response_payload: providerResponse.body,
                    status_code: providerResponse.statusCode,
                }));

                await manager.save(PaymentEvent, this.paymentEventsRepository.create({
                    payment_id: savedPayment.id,
                    type: mapped.eventType,
                    status: mapped.status,
                    note: mapped.note,
                    payload: providerResponse.body,
                }));

                return savedPayment;
            });

            return {
                payment: updatedPayment,
                providerStatusCode: providerResponse.statusCode,
                normalizedMessage: mapped.message,
                canRetry: mapped.canRetry,
                idempotent: false,
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown WAAFI payment error';
            this.logger.error(
                `WAAFI push payment failed for order ${order.id}`,
                error instanceof Error ? error.stack : String(error),
            );

            const failedPayment = await this.dataSource.transaction(async (manager) => {
                const lockedPayment = await manager.findOne(Payment, {
                    where: { id: payment.id },
                    lock: { mode: 'pessimistic_write' },
                });

                if (!lockedPayment) {
                    throw error;
                }

                lockedPayment.status = PaymentStatus.FAILED;
                lockedPayment.provider_status = lockedPayment.provider_status ?? 'FAILED';
                lockedPayment.failure_reason = message;
                lockedPayment.failed_at = new Date();

                const savedPayment = await manager.save(Payment, lockedPayment);

                await manager.save(PaymentLog, this.paymentLogsRepository.create({
                    payment_id: savedPayment.id,
                    type: PaymentLogType.ERROR,
                    endpoint: waafiConfig.baseUrl,
                    request_payload: savedPayment.provider_request ?? null,
                    response_payload: null,
                    status_code: null,
                    error_message: message,
                }));

                await manager.save(PaymentEvent, this.paymentEventsRepository.create({
                    payment_id: savedPayment.id,
                    type: PaymentEventType.FAILED,
                    status: PaymentStatus.FAILED,
                    note: 'WAAFI request failed before a successful provider response was parsed.',
                    payload: {
                        message,
                    },
                }));

                return savedPayment;
            });

            if (error instanceof BadRequestException || error instanceof ServiceUnavailableException) {
                throw error;
            }

            return {
                payment: failedPayment,
                providerStatusCode: null,
                normalizedMessage: 'Payment could not be completed.',
                canRetry: true,
                idempotent: false,
            };
        }
    }

    async handleWebhook(payload: any) {
        return { received: true, payload };
    }

    private async createPaymentAttempt(
        order: Order,
        userId: string,
        initiatePaymentDto: InitiatePushPaymentDto,
    ): Promise<Payment> {
        const requestId = initiatePaymentDto.request_id?.trim() || this.generateRequestId();
        const referenceId = initiatePaymentDto.reference_id?.trim() || order.order_number;
        const invoiceId = initiatePaymentDto.invoice_id?.trim() || order.id;
        const currency = (initiatePaymentDto.currency?.trim() || this.configService.get<string>('payments.waafi.currency') || 'USD')
            .toUpperCase();
        const description = initiatePaymentDto.description?.trim() || `Payment for order ${order.order_number}`;
        const maskedAccount = this.maskAccountNumber(initiatePaymentDto.account_no);

        const payment = this.paymentsRepository.create({
            payment_number: this.generatePaymentNumber(),
            order_id: order.id,
            user_id: userId,
            business_id: order.business_id,
            amount_minor: order.total_amount_minor,
            subtotal_minor: order.subtotal_minor,
            tax_minor: order.tax_minor,
            currency_code: currency,
            provider: PaymentProvider.WAAFI,
            request_id: requestId,
            reference_id: referenceId,
            invoice_id: invoiceId,
            provider_reference: referenceId,
            description,
            status: PaymentStatus.INITIATED,
            payment_method: initiatePaymentDto.payment_method ?? WAAFI_DEFAULT_PAYMENT_METHOD,
            provider_payment_method: this.configService.get<string>('payments.waafi.paymentMethod'),
            account_no: initiatePaymentDto.account_no,
            account_no_masked: maskedAccount,
            mobile_money_number: maskedAccount,
            payment_method_details: {
                channel: this.configService.get<string>('payments.waafi.channelName'),
                payment_method: this.configService.get<string>('payments.waafi.paymentMethod'),
            },
            metadata: {
                initiated_by_user_id: userId,
            },
        });

        const saved = await this.paymentsRepository.save(payment);

        await this.paymentEventsRepository.save(this.paymentEventsRepository.create({
            payment_id: saved.id,
            type: PaymentEventType.INITIATED,
            status: PaymentStatus.INITIATED,
            note: 'Payment attempt created.',
            payload: {
                request_id: requestId,
                account_no_masked: maskedAccount,
            },
        }));

        return saved;
    }

    private async persistRequestLog(paymentId: string, requestPayload: Record<string, any>): Promise<void> {
        await this.paymentLogsRepository.save(this.paymentLogsRepository.create({
            payment_id: paymentId,
            type: PaymentLogType.REQUEST,
            endpoint: this.configService.get<string>('payments.waafi.baseUrl'),
            request_payload: requestPayload,
            response_payload: null,
            status_code: null,
            error_message: null,
        }));

        await this.paymentEventsRepository.save(this.paymentEventsRepository.create({
            payment_id: paymentId,
            type: PaymentEventType.PUSH_SENT,
            status: PaymentStatus.PROCESSING,
            note: 'WAAFI push request submitted.',
            payload: {
                request_id: requestPayload.requestId,
            },
        }));
    }

    private async findReusablePayment(
        orderId: string,
        provider: PaymentProvider,
        initiatePaymentDto: InitiatePushPaymentDto,
    ): Promise<Payment | null> {
        if (initiatePaymentDto.request_id?.trim()) {
            return this.paymentsRepository.findOne({
                where: {
                    provider,
                    request_id: initiatePaymentDto.request_id.trim(),
                },
                order: { created_at: 'DESC' },
            });
        }

        return this.paymentsRepository.findOne({
            where: {
                order_id: orderId,
                provider,
                account_no: initiatePaymentDto.account_no,
                created_at: MoreThan(new Date(Date.now() - WAAFI_IDEMPOTENCY_WINDOW_MS)),
            },
            order: { created_at: 'DESC' },
        });
    }

    private generatePaymentNumber(): string {
        return `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }

    private generateRequestId(): string {
        return `WAAFI-${randomUUID()}`;
    }

    private maskAccountNumber(accountNo: string): string {
        if (accountNo.length <= 4) {
            return accountNo;
        }

        return `${'*'.repeat(accountNo.length - 4)}${accountNo.slice(-4)}`;
    }

    private isRetryableStatus(status: PaymentStatus): boolean {
        return [PaymentStatus.FAILED, PaymentStatus.REJECTED].includes(status);
    }

    private getFriendlyStatusMessage(status: PaymentStatus): string {
        switch (status) {
            case PaymentStatus.CONFIRMED:
                return 'Payment approved successfully.';
            case PaymentStatus.PROCESSING:
                return 'Payment request sent and is pending confirmation.';
            case PaymentStatus.REJECTED:
                return 'Payment was rejected by the user.';
            case PaymentStatus.FAILED:
                return 'Payment could not be completed.';
            default:
                return 'Payment request has already been processed.';
        }
    }
}
