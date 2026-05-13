import {
    BadRequestException,
    Injectable,
    Logger,
    NotFoundException,
    ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
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
import { WAAFI_DEFAULT_PAYMENT_METHOD } from './constants/waafi.constants';
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
    countsTowardRetryLimit: boolean;
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
    ) {}

    async initializePayment(
        orderId: string,
        userId: string,
        initiatePaymentDto: InitiatePushPaymentDto,
    ): Promise<ApiResponseDto<PaymentAttemptResponseDto>> {
        const order = await this.ordersRepository.findOne({
            where: { id: orderId, user_id: userId },
        });
        if (!order) {
            throw new NotFoundException(DEFAULT_MESSAGES.ORDER.NOT_FOUND);
        }

        const result = await this.submitWaafiPushPayment(
            order,
            userId,
            initiatePaymentDto,
        );

        return ApiResponseDto.success(
            result.normalizedMessage,
            PaymentAttemptResponseDto.fromEntity(
                result.payment,
                result.normalizedMessage,
                result.canRetry,
            ),
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
        const provider =
            initiatePaymentDto.payment_provider ?? PaymentProvider.WAAFI;
        if (provider !== PaymentProvider.WAAFI) {
            throw new BadRequestException(
                'Only WAAFI push payments are supported by this integration.',
            );
        }

        const waafiConfig = this.configService.get('payments.waafi');
        if (!waafiConfig?.enabled) {
            throw new ServiceUnavailableException(
                'WAAFI payments are not enabled.',
            );
        }

        const payment = await this.getOrCreatePaymentIntent(
            order,
            userId,
            initiatePaymentDto,
        );
        if (payment.status === PaymentStatus.CONFIRMED) {
            return {
                payment,
                providerStatusCode: null,
                normalizedMessage: 'Payment was already approved successfully.',
                canRetry: false,
                idempotent: true,
                countsTowardRetryLimit: false,
            };
        }

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
            const providerResponse =
                await this.waafiPaymentClientService.pushPayment(
                    requestPayload,
                );
            const mapped = mapWaafiResponse(
                providerResponse.body,
                providerResponse.statusCode,
            );

            const updatedPayment = await this.dataSource.transaction(
                async (manager) => {
                    const lockedPayment = await manager.findOne(Payment, {
                        where: { id: payment.id },
                        lock: { mode: 'pessimistic_write' },
                    });

                    if (!lockedPayment) {
                        throw new NotFoundException(
                            'Payment attempt not found.',
                        );
                    }

                    const terminalFailure = [
                        PaymentStatus.FAILED,
                        PaymentStatus.REJECTED,
                    ].includes(mapped.status);
                    const providerReferenceId = mapped.referenceId?.trim();
                    lockedPayment.status = mapped.status;
                    lockedPayment.provider_status = mapped.providerStatus;
                    lockedPayment.provider_response_code =
                        mapped.providerResponseCode ?? null;
                    lockedPayment.provider_error_code =
                        mapped.providerErrorCode ?? null;
                    lockedPayment.provider_transaction_id =
                        mapped.providerTransactionId ?? null;
                    lockedPayment.issuer_transaction_id =
                        mapped.issuerTransactionId ?? null;
                    lockedPayment.reference_id =
                        providerReferenceId || lockedPayment.reference_id;
                    lockedPayment.account_no_masked =
                        mapped.accountNoMasked ??
                        lockedPayment.account_no_masked;
                    lockedPayment.mobile_money_number =
                        mapped.accountNoMasked ??
                        lockedPayment.mobile_money_number;
                    lockedPayment.provider_request = requestPayload;
                    lockedPayment.provider_response = providerResponse.body;
                    lockedPayment.raw_response = providerResponse.body;
                    lockedPayment.provider_reference =
                        providerReferenceId || payment.reference_id;
                    lockedPayment.payment_method =
                        initiatePaymentDto.payment_method ??
                        WAAFI_DEFAULT_PAYMENT_METHOD;
                    lockedPayment.provider_payment_method =
                        waafiConfig.paymentMethod;
                    lockedPayment.failure_reason = terminalFailure
                        ? (mapped.providerDescription ?? mapped.message)
                        : null;
                    lockedPayment.failed_at = terminalFailure
                        ? new Date()
                        : null;
                    lockedPayment.paid_at =
                        mapped.status === PaymentStatus.CONFIRMED
                            ? new Date()
                            : lockedPayment.paid_at;
                    lockedPayment.metadata = {
                        ...lockedPayment.metadata,
                        provider_status_code: providerResponse.statusCode,
                        provider_response_id:
                            providerResponse.body?.responseId ?? null,
                        waafi_order_id:
                            providerResponse.body?.params?.orderId ?? null,
                        waafi_description: mapped.providerDescription ?? null,
                    };

                    const savedPayment = await manager.save(
                        Payment,
                        lockedPayment,
                    );

                    await manager.save(
                        PaymentLog,
                        this.paymentLogsRepository.create({
                            payment_id: savedPayment.id,
                            type: PaymentLogType.RESPONSE,
                            endpoint: waafiConfig.baseUrl,
                            request_payload: requestPayload,
                            response_payload: providerResponse.body,
                            status_code: providerResponse.statusCode,
                        }),
                    );

                    await manager.save(
                        PaymentEvent,
                        this.paymentEventsRepository.create({
                            payment_id: savedPayment.id,
                            type: mapped.eventType,
                            status: mapped.status,
                            note: mapped.note,
                            payload: providerResponse.body,
                        }),
                    );

                    return savedPayment;
                },
            );

            return {
                payment: updatedPayment,
                providerStatusCode: providerResponse.statusCode,
                normalizedMessage: mapped.message,
                canRetry: mapped.canRetry,
                idempotent: false,
                countsTowardRetryLimit: [
                    PaymentStatus.FAILED,
                    PaymentStatus.REJECTED,
                ].includes(mapped.status),
            };
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Unknown WAAFI payment error';
            const timeoutLikeError =
                error instanceof Error &&
                (error.name === 'TimeoutError' ||
                    error.message.toLowerCase().includes('timeout') ||
                    error.message.toLowerCase().includes('aborted'));
            this.logger.error(
                `WAAFI push payment failed for order ${order.id}`,
                error instanceof Error ? error.stack : String(error),
            );

            const recoveredPayment = await this.dataSource.transaction(
                async (manager) => {
                    const lockedPayment = await manager.findOne(Payment, {
                        where: { id: payment.id },
                        lock: { mode: 'pessimistic_write' },
                    });

                    if (!lockedPayment) {
                        throw error;
                    }

                    lockedPayment.status = PaymentStatus.FAILED;
                    lockedPayment.provider_status = timeoutLikeError
                        ? 'TIMEOUT'
                        : 'FAILED';
                    lockedPayment.provider_request = requestPayload;
                    lockedPayment.provider_response = null;
                    lockedPayment.raw_response = null;
                    lockedPayment.failure_reason = timeoutLikeError
                        ? 'WAAFI request timed out before the server returned a final status.'
                        : message;
                    lockedPayment.failed_at = new Date();
                    lockedPayment.metadata = {
                        ...lockedPayment.metadata,
                        transport_timeout: timeoutLikeError,
                        counts_toward_retry_limit: false,
                        last_transport_error: message,
                    };

                    const savedPayment = await manager.save(
                        Payment,
                        lockedPayment,
                    );

                    await manager.save(
                        PaymentLog,
                        this.paymentLogsRepository.create({
                            payment_id: savedPayment.id,
                            type: PaymentLogType.ERROR,
                            endpoint: waafiConfig.baseUrl,
                            request_payload: requestPayload,
                            response_payload: null,
                            status_code: null,
                            error_message: message,
                        }),
                    );

                    await manager.save(
                        PaymentEvent,
                        this.paymentEventsRepository.create({
                            payment_id: savedPayment.id,
                            type: PaymentEventType.FAILED,
                            status: PaymentStatus.FAILED,
                            note: timeoutLikeError
                                ? 'WAAFI request timed out before a provider response was received; the user may retry with the same payment intent.'
                                : 'WAAFI request failed before a successful provider response was parsed.',
                            payload: {
                                message,
                            },
                        }),
                    );

                    return savedPayment;
                },
            );

            if (
                error instanceof BadRequestException ||
                error instanceof ServiceUnavailableException
            ) {
                throw error;
            }

            return {
                payment: recoveredPayment,
                providerStatusCode: null,
                normalizedMessage: timeoutLikeError
                    ? 'Payment request timed out before WAAFI returned a final response. Please try again.'
                    : 'Payment could not be completed.',
                canRetry: true,
                idempotent: false,
                countsTowardRetryLimit: false,
            };
        }
    }

    async handleWebhook(payload: any) {
        return { received: true, payload };
    }

    private async getOrCreatePaymentIntent(
        order: Order,
        userId: string,
        initiatePaymentDto: InitiatePushPaymentDto,
    ): Promise<Payment> {
        const currency = (
            initiatePaymentDto.currency?.trim() ||
            this.configService.get<string>('payments.waafi.currency') ||
            'USD'
        ).toUpperCase();
        const description =
            initiatePaymentDto.description?.trim() ||
            `Payment for order ${order.order_number}`;
        const maskedAccount = this.maskAccountNumber(
            initiatePaymentDto.account_no,
        );
        const waafiPaymentMethod =
            this.configService.get<string>('payments.waafi.paymentMethod') ??
            null;

        return this.dataSource.transaction(async (manager) => {
            const existingPayment = await manager.findOne(Payment, {
                where: {
                    order_id: order.id,
                    provider: PaymentProvider.WAAFI,
                },
                order: {
                    created_at: 'DESC',
                },
                lock: { mode: 'pessimistic_write' },
            });

            if (existingPayment) {
                if (existingPayment.status === PaymentStatus.CONFIRMED) {
                    return existingPayment;
                }

                const shouldRotateProviderIdentity =
                    this.shouldRotateProviderRequestIdentity(existingPayment);
                const previousRequestId = existingPayment.request_id;
                const previousReferenceId = existingPayment.reference_id;
                const nextRequestId = shouldRotateProviderIdentity
                    ? this.generateRequestId()
                    : existingPayment.request_id ??
                      initiatePaymentDto.request_id?.trim() ??
                      this.generateRequestId();
                const nextReferenceId = shouldRotateProviderIdentity
                    ? this.generateReferenceId(order.order_number)
                    : existingPayment.reference_id ??
                      initiatePaymentDto.reference_id?.trim() ??
                      this.generateReferenceId(order.order_number);

                existingPayment.user_id = userId;
                existingPayment.business_id = order.business_id;
                existingPayment.amount_minor = order.total_amount_minor;
                existingPayment.subtotal_minor = order.subtotal_minor ?? 0;
                existingPayment.tax_minor = order.tax_minor ?? 0;
                existingPayment.currency_code =
                    existingPayment.currency_code ?? currency;
                existingPayment.request_id = nextRequestId;
                existingPayment.reference_id = nextReferenceId;
                existingPayment.invoice_id =
                    existingPayment.invoice_id ??
                    initiatePaymentDto.invoice_id?.trim() ??
                    this.generateInvoiceId(order.id);
                existingPayment.provider_reference = nextReferenceId;
                existingPayment.description = description;
                existingPayment.status = PaymentStatus.PROCESSING;
                existingPayment.provider_status = 'PROCESSING';
                existingPayment.provider_response_code = null;
                existingPayment.provider_error_code = null;
                existingPayment.provider_transaction_id = null;
                existingPayment.issuer_transaction_id = null;
                existingPayment.failure_reason = null;
                existingPayment.failed_at = null;
                existingPayment.payment_method =
                    initiatePaymentDto.payment_method ??
                    WAAFI_DEFAULT_PAYMENT_METHOD;
                existingPayment.provider_payment_method = waafiPaymentMethod;
                existingPayment.account_no = initiatePaymentDto.account_no;
                existingPayment.account_no_masked = maskedAccount;
                existingPayment.mobile_money_number = maskedAccount;
                existingPayment.payment_method_details = {
                    channel: this.configService.get<string>(
                        'payments.waafi.channelName',
                    ),
                    payment_method: waafiPaymentMethod,
                };
                existingPayment.metadata = {
                    ...existingPayment.metadata,
                    last_retry_by_user_id: userId,
                    previous_request_id: previousRequestId,
                    previous_reference_id: previousReferenceId,
                    reused_request_identity: !shouldRotateProviderIdentity,
                    rotated_request_identity: shouldRotateProviderIdentity,
                };

                const saved = await manager.save(Payment, existingPayment);
                await manager.save(
                    PaymentEvent,
                    this.paymentEventsRepository.create({
                        payment_id: saved.id,
                        type: PaymentEventType.RETRIED,
                        status: PaymentStatus.PROCESSING,
                        note: shouldRotateProviderIdentity
                            ? 'Payment retry started with a fresh WAAFI request identity.'
                            : 'Payment retry started using the existing WAAFI request identity.',
                        payload: {
                            request_id: saved.request_id,
                            reference_id: saved.reference_id,
                            previous_request_id: previousRequestId,
                            previous_reference_id: previousReferenceId,
                            rotated_request_identity:
                                shouldRotateProviderIdentity,
                            account_no_masked: maskedAccount,
                        },
                    }),
                );

                return saved;
            }

            const requestId =
                initiatePaymentDto.request_id?.trim() ||
                this.generateRequestId();
            const referenceId =
                initiatePaymentDto.reference_id?.trim() ||
                this.generateReferenceId(order.order_number);
            const invoiceId =
                initiatePaymentDto.invoice_id?.trim() ||
                this.generateInvoiceId(order.id);

            const payment = this.paymentsRepository.create({
                payment_number: this.generatePaymentNumber(),
                order_id: order.id,
                user_id: userId,
                business_id: order.business_id,
                amount_minor: order.total_amount_minor,
                subtotal_minor: order.subtotal_minor ?? 0,
                tax_minor: order.tax_minor ?? 0,
                currency_code: currency,
                provider: PaymentProvider.WAAFI,
                request_id: requestId,
                reference_id: referenceId,
                invoice_id: invoiceId,
                provider_reference: referenceId,
                description,
                status: PaymentStatus.INITIATED,
                payment_method:
                    initiatePaymentDto.payment_method ??
                    WAAFI_DEFAULT_PAYMENT_METHOD,
                provider_payment_method: waafiPaymentMethod,
                account_no: initiatePaymentDto.account_no,
                account_no_masked: maskedAccount,
                mobile_money_number: maskedAccount,
                payment_method_details: {
                    channel: this.configService.get<string>(
                        'payments.waafi.channelName',
                    ),
                    payment_method: waafiPaymentMethod,
                },
                metadata: {
                    initiated_by_user_id: userId,
                    reused_request_identity: false,
                },
            });

            const saved = await manager.save(Payment, payment);

            await manager.save(
                PaymentEvent,
                this.paymentEventsRepository.create({
                    payment_id: saved.id,
                    type: PaymentEventType.INITIATED,
                    status: PaymentStatus.INITIATED,
                    note: 'Payment intent created.',
                    payload: {
                        request_id: requestId,
                        reference_id: referenceId,
                        account_no_masked: maskedAccount,
                    },
                }),
            );

            return saved;
        });
    }

    private shouldRotateProviderRequestIdentity(payment: Payment): boolean {
        if (
            [PaymentStatus.FAILED, PaymentStatus.REJECTED].includes(
                payment.status,
            )
        ) {
            return true;
        }

        const providerStatus = payment.provider_status?.toUpperCase();
        return providerStatus === 'TIMEOUT' || providerStatus === 'EXPIRED';
    }

    private async persistRequestLog(
        paymentId: string,
        requestPayload: Record<string, any>,
    ): Promise<void> {
        await this.paymentLogsRepository.save(
            this.paymentLogsRepository.create({
                payment_id: paymentId,
                type: PaymentLogType.REQUEST,
                endpoint: this.configService.get<string>(
                    'payments.waafi.baseUrl',
                ),
                request_payload: requestPayload,
                response_payload: null,
                status_code: null,
                error_message: null,
            }),
        );

        await this.paymentEventsRepository.save(
            this.paymentEventsRepository.create({
                payment_id: paymentId,
                type: PaymentEventType.PUSH_SENT,
                status: PaymentStatus.PROCESSING,
                note: 'WAAFI push request submitted.',
                payload: {
                    request_id: requestPayload.requestId,
                },
            }),
        );
    }

    private generatePaymentNumber(): string {
        return `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }

    private generateRequestId(): string {
        return this.generateNumericIdentifier(14);
    }

    private generateReferenceId(orderNumber: string): string {
        return this.generateNumericIdentifier(10);
    }

    private generateInvoiceId(orderId: string): string {
        return this.generateNumericIdentifier(10);
    }

    private generateNumericIdentifier(length: number): string {
        let value = `${Date.now()}${Math.floor(Math.random() * 1000000)}`;
        if (value.length < length) {
            value = value.padEnd(length, '0');
        }

        return value.slice(0, length);
    }

    private maskAccountNumber(accountNo: string): string {
        if (accountNo.length <= 4) {
            return accountNo;
        }

        return `${'*'.repeat(accountNo.length - 4)}${accountNo.slice(-4)}`;
    }
}
