import {
    Injectable,
    BadRequestException,
    NotFoundException,
    ConflictException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
    Repository,
    DataSource,
    EntityManager,
    LessThanOrEqual,
    In,
    SelectQueryBuilder,
} from 'typeorm';
import { Interval } from '@nestjs/schedule';
import { Order } from './entities/order.entity';
import { OrderEvent } from './entities/order-event.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { MarkOrderPaidDto } from './dto/mark-order-paid.dto';
import { CancelOrderReservationDto } from './dto/cancel-order-reservation.dto';
import { AdminCancelOrderDto } from './dto/admin-cancel-order.dto';
import { AdminCompleteOrderDto } from './dto/admin-complete-order.dto';
import { Offer } from '../offers/entities/offer.entity';
import { AppUser } from '../users/entities/app-user.entity';
import { Business } from '../businesses/entities/business.entity';
import {
    OrderStatus,
    OfferStatus,
    PaymentProvider,
    PaymentStatus,
    PayoutMethod,
} from '../../common/entities/enums/all.enums';
import { ConfigService } from '@nestjs/config';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { DEFAULT_MESSAGES } from '../../common/constants/default-messages';
import { MobileUserOrderDto, OrderResponseDto } from './dto/order-response.dto';
import { AdminOrderResponseDto } from './dto/admin-order-response.dto';
import {
    ADMIN_PENDING_ORDER_STATUSES,
    ORDER_HOLD_MINUTES,
} from '../../config/orders.config';
import { AdminCloseNoShowOrderDto } from './dto/admin-close-no-show-order.dto';
import { PaymentsService } from '../payments/payments.service';
import { Payment } from '../payments/entities/payment.entity';
import { UserStatisticsService } from '../users/user-statistics.service';
import { RewardsService } from '../rewards/rewards.service';
import { ReviewRemindersService } from '../reviews/review-reminders.service';
import { OrderHoldsQueueService } from './order-holds-queue.service';

@Injectable()
export class OrdersService {
    private readonly logger = new Logger(OrdersService.name);
    private isRestoringExpiredOrders = false;

    constructor(
        @InjectRepository(Order)
        private ordersRepository: Repository<Order>,
        @InjectRepository(OrderEvent)
        private orderEventsRepository: Repository<OrderEvent>,
        @InjectRepository(Business)
        private businessesRepository: Repository<Business>,
        @InjectRepository(Payment)
        private paymentsRepository: Repository<Payment>,
        private dataSource: DataSource,
        private configService: ConfigService,
        private paymentsService: PaymentsService,
        private userStatisticsService: UserStatisticsService,
        private rewardsService: RewardsService,
        private reviewRemindersService: ReviewRemindersService,
        private orderHoldsQueueService: OrderHoldsQueueService,
    ) { }


    async reserve(createOrderDto: CreateOrderDto, user: AppUser): Promise<ApiResponseDto<OrderResponseDto>> {
        const { offer_id, quantity } = createOrderDto;

        const created = await this.dataSource.transaction(async (manager: EntityManager) => {
            const offer = await manager.findOne(Offer, {
                where: { id: offer_id },
                lock: { mode: 'pessimistic_write' },
            });

            if (!offer) {
                throw new NotFoundException(`${DEFAULT_MESSAGES.OFFER.NOT_FOUND}: ${offer_id}`);
            }

            if (offer.status !== OfferStatus.PUBLISHED) {
                throw new BadRequestException(DEFAULT_MESSAGES.OFFER.INACTIVE);
            }

            if (offer.quantity_remaining < quantity) {
                throw new ConflictException(DEFAULT_MESSAGES.ORDER.INSUFFICIENT_QUANTITY);
            }

            offer.quantity_remaining -= quantity;
            offer.quantity_reserved += quantity;
            await manager.save(offer);

            const holdDurationMinutes = this.configService.get<number>('orders.holdMinutes') ?? ORDER_HOLD_MINUTES;
            const holdExpiresAt = new Date(Date.now() + holdDurationMinutes * 60 * 1000);

            const order = manager.create(Order, {
                order_number: this.generateOrderNumber(),
                pickup_code: this.generatePickupCode(),
                user_id: user.id,
                business_id: offer.business_id,
                offer_id: offer.id,
                quantity,
                unit_price_minor: offer.offer_price_minor,
                status: OrderStatus.HOLD,
                hold_expires_at: holdExpiresAt,
                pickup_time: offer.pickup_start,
            });

            const saved = await manager.save(Order, order);
            await this.recordOrderEvent(manager, {
                orderId: saved.id,
                toStatus: OrderStatus.HOLD,
                toPaymentStatus: PaymentStatus.PENDING,
                actorType: 'USER',
                actorId: user.id,
                note: `Reserved ${quantity} item(s) for ${holdDurationMinutes} minutes.`,
            });
            await this.userStatisticsService.rebuildForUser(manager, saved.user_id);

            return saved;
        });

        const withRelations = await this.getOrderWithRelations(created.id);
        await this.orderHoldsQueueService.scheduleHoldExpiry(created.id, created.hold_expires_at);

        return ApiResponseDto.success(DEFAULT_MESSAGES.ORDER.CREATED, OrderResponseDto.fromEntity(withRelations));
    }

    async markPaid(
        id: string,
        userId: string,
        markOrderPaidDto: MarkOrderPaidDto,
    ): Promise<ApiResponseDto<OrderResponseDto>> {
        const preparation = await this.dataSource.transaction(async (manager: EntityManager) => {
            const order = await this.getOwnedOrderForUpdate(manager, id, userId);

            if (order.status === OrderStatus.PAID || order.payment_status === PaymentStatus.CONFIRMED) {
                return {
                    orderId: order.id,
                    wasExpired: false,
                    alreadyPaid: true,
                };
            }

            if (order.status !== OrderStatus.HOLD && order.status !== OrderStatus.PENDING_PAYMENT) {
                throw new BadRequestException(DEFAULT_MESSAGES.ORDER.NOT_ACTIVE_HOLD);
            }

            if (this.isHoldExpired(order)) {
                const expired = await this.restoreExpiredHold(manager, order);
                return { orderId: expired.id, wasExpired: true, alreadyPaid: false };
            }

            const previousStatus = order.status;
            const previousPaymentStatus = order.payment_status;
            order.status = OrderStatus.PENDING_PAYMENT;
            order.payment_status = PaymentStatus.INITIATED;
            order.payment_provider = markOrderPaidDto.payment_provider ?? PaymentProvider.WAAFI;
            order.payment_method = markOrderPaidDto.payment_method ?? PayoutMethod.MWALLET_ACCOUNT;

            const saved = await manager.save(Order, order);
            await this.recordOrderEvent(manager, {
                orderId: saved.id,
                fromStatus: previousStatus,
                toStatus: saved.status,
                fromPaymentStatus: previousPaymentStatus,
                toPaymentStatus: saved.payment_status,
                actorType: 'USER',
                actorId: userId,
                note: 'Payment push request initiated.',
            });

            return { orderId: saved.id, wasExpired: false, alreadyPaid: false };
        });

        if (preparation.wasExpired) {
            throw new ConflictException(DEFAULT_MESSAGES.ORDER.HOLD_EXPIRED);
        }

        if (preparation.alreadyPaid) {
            const withRelations = await this.getOrderWithRelations(preparation.orderId);
            return ApiResponseDto.success(DEFAULT_MESSAGES.ORDER.PAID, OrderResponseDto.fromEntity(withRelations), {
                idempotent: true,
            });
        }

        const orderForPayment = await this.ordersRepository.findOne({ where: { id: preparation.orderId, user_id: userId } });
        if (!orderForPayment) {
            throw new NotFoundException(`${DEFAULT_MESSAGES.ORDER.NOT_FOUND}: ${id}`);
        }

        const paymentResult = await this.paymentsService.submitWaafiPushPayment(orderForPayment, userId, markOrderPaidDto);

        const finalizedResult = await this.dataSource.transaction(async (manager: EntityManager) => {
            const order = await this.getOwnedOrderForUpdate(manager, id, userId);
            const previousStatus = order.status;
            const previousPaymentStatus = order.payment_status;
            const now = new Date();
            let releasedAfterFailureLimit = false;

            order.payment_provider = paymentResult.payment.provider;
            order.payment_method = paymentResult.payment.payment_method ?? undefined;
            order.payment_intent_id = paymentResult.payment.request_id ?? undefined;
            order.payment_transaction_id =
                paymentResult.payment.provider_transaction_id ??
                paymentResult.payment.issuer_transaction_id ??
                paymentResult.payment.reference_id ??
                undefined;

            if (paymentResult.payment.status === PaymentStatus.CONFIRMED) {
                order.status = OrderStatus.PAID;
                order.payment_status = PaymentStatus.CONFIRMED;
                order.confirmed_at = order.confirmed_at ?? now;
                order.paid_at = now;
                (order as any).hold_expires_at = null;

                const offer = await this.getOfferForUpdate(manager, order.offer_id);
                offer.quantity_reserved = Math.max(offer.quantity_reserved - order.quantity, 0);
                await manager.save(offer);
            } else if (paymentResult.payment.status === PaymentStatus.PROCESSING) {
                order.status = OrderStatus.PENDING_PAYMENT;
                order.payment_status = PaymentStatus.PROCESSING;
            } else if (paymentResult.payment.status === PaymentStatus.REJECTED) {
                order.status = OrderStatus.PENDING_PAYMENT;
                order.payment_status = PaymentStatus.REJECTED;
            } else {
                order.status = OrderStatus.PENDING_PAYMENT;
                order.payment_status = PaymentStatus.FAILED;
            }

            if ([PaymentStatus.FAILED, PaymentStatus.REJECTED].includes(order.payment_status)) {
                const failedAttempts = await manager.count(Payment, {
                    where: {
                        order_id: order.id,
                        status: In([PaymentStatus.FAILED, PaymentStatus.REJECTED]),
                    },
                });

                if (failedAttempts >= 3) {
                    const offer = await this.getOfferForUpdate(manager, order.offer_id);
                    this.restoreOfferQuantity(offer, order.quantity);
                    order.status = OrderStatus.CANCELLED_BY_USER;
                    order.cancelled_at = now;
                    order.cancellation_reason = 'Reservation released after three unsuccessful payment attempts.';
                    (order as any).hold_expires_at = null;
                    await manager.save(offer);
                    releasedAfterFailureLimit = true;
                }
            }

            const saved = await manager.save(Order, order);
            await this.recordOrderEvent(manager, {
                orderId: saved.id,
                fromStatus: previousStatus,
                toStatus: saved.status,
                fromPaymentStatus: previousPaymentStatus,
                toPaymentStatus: saved.payment_status,
                actorType: 'USER',
                actorId: userId,
                note: paymentResult.normalizedMessage,
            });

            if (saved.payment_status === PaymentStatus.CONFIRMED) {
                await this.rewardsService.awardApprovedPayment(manager, paymentResult.payment);
            }

            await this.userStatisticsService.rebuildForUser(manager, saved.user_id);
            return {
                orderId: saved.id,
                releasedAfterFailureLimit,
            };
        });

        if (
            paymentResult.payment.status === PaymentStatus.CONFIRMED ||
            finalizedResult.releasedAfterFailureLimit
        ) {
            await this.orderHoldsQueueService.cancelHoldExpiry(finalizedResult.orderId);
        }

        const withRelations = await this.getOrderWithRelations(finalizedResult.orderId);
        const meta = {
            payment: {
                id: paymentResult.payment.id,
                status: paymentResult.payment.status,
                request_id: paymentResult.payment.request_id,
                reference_id: paymentResult.payment.reference_id,
                provider_response_code: paymentResult.payment.provider_response_code,
                provider_error_code: paymentResult.payment.provider_error_code,
            },
            idempotent: paymentResult.idempotent,
        };

        const paymentOutcome = this.getPaymentOutcome(paymentResult);
        const responseMessage = finalizedResult.releasedAfterFailureLimit
            ? 'Payment failed. Your reservation was released after three unsuccessful attempts.'
            : this.getPaymentOutcomeMessage(paymentOutcome, paymentResult.normalizedMessage);

        return ApiResponseDto.success(responseMessage, OrderResponseDto.fromEntity(withRelations), {
            ...meta,
            paymentOutcome,
        });
    }

    async cancelReservation(
        id: string,
        userId: string,
        cancelOrderReservationDto: CancelOrderReservationDto,
    ): Promise<ApiResponseDto<OrderResponseDto>> {
        const result = await this.dataSource.transaction(async (manager: EntityManager) => {
            const order = await this.getOwnedOrderForUpdate(manager, id, userId);

            if (order.status !== OrderStatus.HOLD && order.status !== OrderStatus.PENDING_PAYMENT) {
                throw new BadRequestException(DEFAULT_MESSAGES.ORDER.NOT_ACTIVE_HOLD);
            }

            if (this.isHoldExpired(order)) {
                const expired = await this.restoreExpiredHold(manager, order);
                return { order: expired, wasExpired: true };
            }

            const previousStatus = order.status;
            const previousPaymentStatus = order.payment_status;
            const now = new Date();
            const offer = await this.getOfferForUpdate(manager, order.offer_id);

            this.restoreOfferQuantity(offer, order.quantity);
            order.status = OrderStatus.CANCELLED_BY_USER;
            order.cancelled_at = now;
            order.cancellation_reason = cancelOrderReservationDto.reason;
            (order as any).hold_expires_at = null;

            await manager.save(offer);
            const saved = await manager.save(Order, order);
            await this.recordOrderEvent(manager, {
                orderId: saved.id,
                fromStatus: previousStatus,
                toStatus: saved.status,
                fromPaymentStatus: previousPaymentStatus,
                toPaymentStatus: saved.payment_status,
                actorType: 'USER',
                actorId: userId,
                note: cancelOrderReservationDto.reason ?? 'Reservation cancelled by user.',
            });
            await this.userStatisticsService.rebuildForUser(manager, saved.user_id);

            return { order: saved, wasExpired: false };
        });

        if (result.wasExpired) {
            throw new ConflictException(DEFAULT_MESSAGES.ORDER.HOLD_EXPIRED);
        }

        await this.orderHoldsQueueService.cancelHoldExpiry(result.order.id);
        const withRelations = await this.getOrderWithRelations(result.order.id);
        return ApiResponseDto.success(DEFAULT_MESSAGES.ORDER.CANCELLED, OrderResponseDto.fromEntity(withRelations));
    }

    // NOTE wait extra hours to reduce no-shows for the late pickup timeslot before restoring quantity back to the offer
    async getTodayPendingOrdersByBusiness(businessId: string): Promise<ApiResponseDto<AdminOrderResponseDto[]>> {
        const { start, end } = await this.getBusinessTodayRange(businessId);
        const statuses =
            this.configService.get<OrderStatus[]>('orders.adminPendingStatuses') ?? ADMIN_PENDING_ORDER_STATUSES;

        const orders = await this.createAdminOrderSummaryQuery()
            .where('ord.business_id = :businessId', { businessId })
            .andWhere('ord.status IN (:...statuses)', { statuses })
            .andWhere('ord.created_at >= :start', { start })
            .andWhere('ord.created_at < :end', { end })
            .orderBy('ord.created_at', 'ASC')
            .getMany();

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.ORDER.LIST_FETCHED,
            orders.map((order) => AdminOrderResponseDto.fromEntity(order)),
        );
    }

    async getCompletedOrdersByBusiness(
        businessId: string,
        startParam?: string,
        endParam?: string,
    ): Promise<ApiResponseDto<AdminOrderResponseDto[]>> {
        const { start, end } = await this.getBusinessRangeFromParams(businessId, startParam, endParam);

        const orders = await this.createAdminOrderSummaryQuery()
            .where('ord.business_id = :businessId', { businessId })
            .andWhere('ord.status = :status', { status: OrderStatus.COLLECTED })
            .andWhere('ord.created_at >= :start', { start })
            .andWhere('ord.created_at < :end', { end })
            .orderBy('ord.collected_at', 'DESC')
            .getMany();

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.ORDER.LIST_FETCHED,
            orders.map((order) => AdminOrderResponseDto.fromEntity(order)),
        );
    }

    async getCancelledOrdersByBusiness(
        businessId: string,
        startParam?: string,
        endParam?: string,
    ): Promise<ApiResponseDto<AdminOrderResponseDto[]>> {
        const { start, end } = await this.getBusinessRangeFromParams(businessId, startParam, endParam);

        const orders = await this.createAdminOrderSummaryQuery()
            .where('ord.business_id = :businessId', { businessId })
            .andWhere('ord.status = :status', { status: OrderStatus.CANCELLED_BY_ADMIN })
            .andWhere('ord.cancelled_at >= :start', { start })
            .andWhere('ord.cancelled_at < :end', { end })
            .orderBy('ord.cancelled_at', 'DESC')
            .getMany();

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.ORDER.LIST_FETCHED,
            orders.map((order) => AdminOrderResponseDto.fromEntity(order)),
        );
    }

    async getNoShowOrdersByBusiness(
        businessId: string,
        startParam?: string,
        endParam?: string,
    ): Promise<ApiResponseDto<AdminOrderResponseDto[]>> {
        const { start, end } = await this.getBusinessRangeFromParams(businessId, startParam, endParam);

        const orders = await this.createAdminOrderSummaryQuery()
            .where('ord.business_id = :businessId', { businessId })
            .andWhere('ord.status = :status', { status: OrderStatus.NO_SHOW })
            .andWhere('offer.pickup_end >= :start', { start })
            .andWhere('offer.pickup_end < :end', { end })
            .orderBy('offer.pickup_end', 'DESC')
            .addOrderBy('ord.no_show_at', 'DESC')
            .getMany();

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.ORDER.LIST_FETCHED,
            orders.map((order) => AdminOrderResponseDto.fromEntity(order)),
        );
    }

    async adminCancelOrder(
        id: string,
        adminCancelOrderDto: AdminCancelOrderDto,
        actor: any,
    ): Promise<ApiResponseDto<null>> {
        const result = await this.dataSource.transaction(async (manager: EntityManager) => {
            const order = await this.getOrderForUpdate(manager, id);

            if (order.status === OrderStatus.CANCELLED_BY_ADMIN || order.status === OrderStatus.CANCELLED_BY_USER) {
                throw new ConflictException(DEFAULT_MESSAGES.ORDER.ALREADY_CANCELLED);
            }
            if (order.status === OrderStatus.COLLECTED || order.status === OrderStatus.EXPIRED || order.status === OrderStatus.NO_SHOW) {
                throw new BadRequestException(DEFAULT_MESSAGES.ORDER.CANNOT_CANCEL);
            }

            const previousStatus = order.status;
            const previousPaymentStatus = order.payment_status;
            const offer = await this.getOfferForUpdate(manager, order.offer_id);

            if (order.status === OrderStatus.HOLD || order.status === OrderStatus.PENDING_PAYMENT) {
                this.restoreOfferQuantity(offer, order.quantity);
            } else {
                offer.quantity_remaining += order.quantity;
            }

            order.status = OrderStatus.CANCELLED_BY_ADMIN;
            order.cancelled_at = new Date();
            order.cancellation_reason = adminCancelOrderDto.reason;
            (order as any).hold_expires_at = null;

            if (adminCancelOrderDto.refund !== false) {
                this.applySimpleRefund(order);
            }

            await manager.save(offer);
            const saved = await manager.save(Order, order);
            await this.recordOrderEvent(manager, {
                orderId: saved.id,
                fromStatus: previousStatus,
                toStatus: saved.status,
                fromPaymentStatus: previousPaymentStatus,
                toPaymentStatus: saved.payment_status,
                actorType: 'STAFF',
                actorId: actor?.id,
                actorName: actor?.full_name ?? actor?.email,
                note: adminCancelOrderDto.reason,
            });
            await this.userStatisticsService.rebuildForUser(manager, saved.user_id);

            return saved;
        });

        await this.orderHoldsQueueService.cancelHoldExpiry(result.id);
        return ApiResponseDto.success(
            DEFAULT_MESSAGES.ORDER.ADMIN_CANCELLED,
            null
        );
    }

    async adminCompleteOrder(
        id: string,
        adminCompleteOrderDto: AdminCompleteOrderDto,
        actor: any,
    ): Promise<ApiResponseDto<null>> {
        const completedOrderId = await this.dataSource.transaction(async (manager: EntityManager) => {
            const order = await this.getOrderForUpdate(manager, id);

            if (order.status === OrderStatus.COLLECTED) {
                throw new ConflictException(DEFAULT_MESSAGES.ORDER.ALREADY_COMPLETED);
            }

            if (
                order.status !== OrderStatus.PAID &&
                order.status !== OrderStatus.READY_FOR_PICKUP
            ) {
                throw new BadRequestException(DEFAULT_MESSAGES.ORDER.CANNOT_COMPLETE);
            }

            const submittedPinCode = adminCompleteOrderDto.pin_code.trim().toUpperCase();
            if (order.pickup_code !== submittedPinCode) {
                throw new BadRequestException(DEFAULT_MESSAGES.ORDER.INVALID_PICKUP_CODE);
            }

            const previousStatus = order.status;
            const previousPaymentStatus = order.payment_status;
            const now = new Date();
            const offer = await this.getOfferForUpdate(manager, order.offer_id);

            order.status = OrderStatus.COLLECTED;
            order.collected_at = now;
            order.pickup_verified_at = now;
            order.pickup_verified_by = actor?.id ?? order.pickup_verified_by;

            await manager.save(offer);
            // await manager.increment(Business, { id: order.business_id }, 'completed_orders', 1);
            const saved = await manager.save(Order, order);
            await this.recordOrderEvent(manager, {
                orderId: saved.id,
                fromStatus: previousStatus,
                toStatus: saved.status,
                fromPaymentStatus: previousPaymentStatus,
                toPaymentStatus: saved.payment_status,
                actorType: 'STAFF',
                actorId: actor?.id,
                actorName: actor?.full_name ?? actor?.email,
                note: 'Pickup pin code verified and order completed.',
            });
            await this.userStatisticsService.rebuildForUser(manager, saved.user_id);

            return saved.id;
        });
        await this.orderHoldsQueueService.cancelHoldExpiry(completedOrderId);
        await this.reviewRemindersService.scheduleForCollectedOrder(completedOrderId);
        return ApiResponseDto.success(DEFAULT_MESSAGES.ORDER.COMPLETED, null);
    }

    async adminCloseNoShowOrder(
        id: string,
        adminCloseNoShowOrderDto: AdminCloseNoShowOrderDto,
        actor: any,
    ): Promise<ApiResponseDto<null>> {
        await this.dataSource.transaction(async (manager: EntityManager) => {
            const order = await this.getOrderForUpdate(manager, id);

            if (order.status !== OrderStatus.NO_SHOW) {
                throw new BadRequestException(DEFAULT_MESSAGES.ORDER.NOT_NO_SHOW);
            }

            const previousStatus = order.status;
            const previousPaymentStatus = order.payment_status;
            const now = new Date();
            const restoredQuantity = adminCloseNoShowOrderDto.restore_quantity === true;

            if (restoredQuantity) {
                const offer = await this.getOfferForUpdate(manager, order.offer_id);
                this.restoreSoldOfferQuantity(offer, order.quantity, order.total_amount_minor);
                await manager.save(offer);
            }

            order.status = OrderStatus.NO_SHOW;
            order.cancellation_reason = adminCloseNoShowOrderDto.reason ?? order.cancellation_reason;

            const saved = await manager.save(Order, order);
            await this.recordOrderEvent(manager, {
                orderId: saved.id,
                fromStatus: previousStatus,
                toStatus: saved.status,
                fromPaymentStatus: previousPaymentStatus,
                toPaymentStatus: saved.payment_status,
                actorType: 'STAFF',
                actorId: actor?.id,
                actorName: actor?.full_name ?? actor?.email,
                note:
                    adminCloseNoShowOrderDto.reason ??
                    (restoredQuantity
                        ? 'No-show order closed and quantity restored to the offer.'
                        : 'No-show order closed without restoring quantity.'),
            });

            return saved;
        });

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.ORDER.NO_SHOW_CLOSED,
            null,
        );
    }

    @Interval(10_000)
    async restoreExpiredUnpaidOrders(): Promise<void> {
        if (this.isRestoringExpiredOrders) {
            return;
        }

        this.isRestoringExpiredOrders = true;
        try {
            const restoredCount = await this.dataSource.transaction(async (manager: EntityManager) => {
                const expiredOrders = await manager.find(Order, {
                    where: {
                        status: In([OrderStatus.HOLD, OrderStatus.PENDING_PAYMENT]),
                        payment_status: In([
                            PaymentStatus.PENDING,
                            PaymentStatus.INITIATED,
                            PaymentStatus.PROCESSING,
                            PaymentStatus.FAILED,
                            PaymentStatus.REJECTED,
                        ]),
                        hold_expires_at: LessThanOrEqual(new Date()),
                    },
                    order: { hold_expires_at: 'ASC' },
                    take: 100,
                    lock: { mode: 'pessimistic_write' },
                });

                for (const order of expiredOrders) {
                    await this.restoreExpiredHold(manager, order);
                }

                return expiredOrders.length;
            });

            if (restoredCount > 0) {
                this.logger.log(`Restored ${restoredCount} expired unpaid order(s).`);
            }
        } catch (error) {
            this.logger.error(
                'Failed to restore expired unpaid orders',
                error instanceof Error ? error.stack : String(error),
            );
        } finally {
            this.isRestoringExpiredOrders = false;
        }
    }

    generateOrderNumber(): string {
        return `KAM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }

    generatePickupCode(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    async findAll(userId: string): Promise<ApiResponseDto<MobileUserOrderDto[]>> {
        const userVisibleStatuses = [
            OrderStatus.PAID,
            OrderStatus.READY_FOR_PICKUP,
            OrderStatus.COLLECTED,
            OrderStatus.CANCELLED_BY_ADMIN,
        ];
        const orders = await this.createUserOrderQuery()
            .where('ord.user_id = :userId', { userId })
            .andWhere('ord.status IN (:...statuses)', { statuses: userVisibleStatuses })
            .orderBy('ord.created_at', 'DESC')
            .getMany();

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.ORDER.LIST_FETCHED,
            orders.map((order) => MobileUserOrderDto.fromEntity(order)),
        );
    }

    async findOne(id: string, userId: string): Promise<ApiResponseDto<OrderResponseDto>> {
        const order = await this.createUserOrderQuery()
            .where('ord.id = :id', { id })
            .andWhere('ord.user_id = :userId', { userId })
            .getOne();
        if (!order) throw new NotFoundException(`${DEFAULT_MESSAGES.ORDER.NOT_FOUND}: ${id}`);

        return ApiResponseDto.success(DEFAULT_MESSAGES.ORDER.FETCHED, OrderResponseDto.fromEntity(order));
    }

    private async getOrderWithRelations(id: string): Promise<Order> {
        const order = await this.createUserOrderQuery()
            .where('ord.id = :id', { id })
            .getOne();
        if (!order) throw new NotFoundException(`${DEFAULT_MESSAGES.ORDER.NOT_FOUND}: ${id}`);

        return order;
    }

    private createAdminOrderSummaryQuery(): SelectQueryBuilder<Order> {
        const query = this.ordersRepository
            .createQueryBuilder('ord')
            .leftJoinAndSelect('ord.user', 'user')
            .leftJoinAndSelect('ord.business', 'business')
            .leftJoinAndSelect('business.city', 'city')
            .leftJoinAndSelect('city.country', 'country')
            .leftJoinAndSelect('ord.offer', 'offer');

        query.select([
            'ord.id',
            'ord.order_number',
            'ord.user_id',
            'ord.business_id',
            'ord.offer_id',
            'ord.quantity',
            'ord.unit_price_minor',
            'ord.subtotal_minor',
            'ord.tax_minor',
            'ord.discount_minor',
            'ord.total_amount_minor',
            'ord.status',
            'ord.payment_status',
            'ord.pickup_time',
            'ord.cancelled_at',
            'ord.collected_at',
            'ord.no_show_at',
            'ord.cancellation_reason',
            'ord.created_at',
            'user.id',
            'user.first_name',
            'user.last_name',
            'user.phone_e164',
            'user.email',
            'business.id',
            'business.display_name',
            'business.city_id',
            'city.id',
            'country.id',
            'country.default_timezone',
            'offer.id',
            'offer.title',
            'offer.main_image_url',
            'offer.pickup_start',
            'offer.pickup_end',
        ]);

        return query;
    }

    private async getAdminOrderWithRelations(id: string): Promise<Order> {
        const order = await this.ordersRepository.findOne({
            where: { id },
            relations: ['user', 'offer', 'business'],
        });
        if (!order) throw new NotFoundException(`${DEFAULT_MESSAGES.ORDER.NOT_FOUND}: ${id}`);

        return order;
    }

    private async getOrderForUpdate(manager: EntityManager, id: string): Promise<Order> {
        const order = await manager.findOne(Order, {
            where: { id },
            lock: { mode: 'pessimistic_write' },
        });
        if (!order) throw new NotFoundException(`${DEFAULT_MESSAGES.ORDER.NOT_FOUND}: ${id}`);

        return order;
    }

    private async getBusinessTodayRange(businessId: string): Promise<{ start: Date; end: Date }> {
        const business = await this.businessesRepository.findOne({ where: { id: businessId } });
        if (!business) throw new NotFoundException(`${DEFAULT_MESSAGES.BUSINESS.NOT_FOUND}: ${businessId}`);

        return this.getTodayRangeForTimezone('Africa/Mogadishu');
    }

    private async getBusinessRangeFromParams(
        businessId: string,
        startParam?: string,
        endParam?: string,
    ): Promise<{ start: Date; end: Date }> {
        const business = await this.businessesRepository.findOne({ where: { id: businessId } });
        if (!business) throw new NotFoundException(`${DEFAULT_MESSAGES.BUSINESS.NOT_FOUND}: ${businessId}`);

        const timezone = 'Africa/Mogadishu';
        const todayRange = this.getTodayRangeForTimezone(timezone);
        const start = startParam
            ? this.parseDateRangeParam(startParam, timezone, 'start')
            : todayRange.start;
        const end = endParam
            ? this.parseDateRangeParam(endParam, timezone, 'end')
            : todayRange.end;

        if (start >= end) {
            throw new BadRequestException('start must be earlier than end');
        }

        return { start, end };
    }

    private getTodayRangeForTimezone(timezone: string): { start: Date; end: Date } {
        const todayParts = this.getZonedDateParts(new Date(), timezone);
        const start = this.zonedTimeToUtc(timezone, {
            year: todayParts.year,
            month: todayParts.month,
            day: todayParts.day,
            hour: 0,
            minute: 0,
            second: 0,
        });
        const end = this.zonedTimeToUtc(timezone, {
            year: todayParts.year,
            month: todayParts.month,
            day: todayParts.day + 1,
            hour: 0,
            minute: 0,
            second: 0,
        });

        return { start, end };
    }

    private parseDateRangeParam(
        value: string,
        timezone: string,
        boundary: 'start' | 'end',
    ): Date {
        const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

        if (dateOnlyMatch) {
            const [, year, month, day] = dateOnlyMatch;
            return this.zonedTimeToUtc(timezone, {
                year: Number(year),
                month: Number(month),
                day: Number(day) + (boundary === 'end' ? 1 : 0),
                hour: 0,
                minute: 0,
                second: 0,
            });
        }

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            throw new BadRequestException(`Invalid ${boundary} date: ${value}`);
        }

        return parsed;
    }

    private zonedTimeToUtc(
        timezone: string,
        parts: { year: number; month: number; day: number; hour: number; minute: number; second: number },
    ): Date {
        const utcGuess = new Date(
            Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second),
        );
        const offset = this.getTimezoneOffsetMs(utcGuess, timezone);

        return new Date(utcGuess.getTime() - offset);
    }

    private getTimezoneOffsetMs(date: Date, timezone: string): number {
        const parts = this.getZonedDateParts(date, timezone);
        const zonedAsUtc = Date.UTC(
            parts.year,
            parts.month - 1,
            parts.day,
            parts.hour,
            parts.minute,
            parts.second,
        );

        return zonedAsUtc - date.getTime();
    }

    private getZonedDateParts(
        date: Date,
        timezone: string,
    ): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hourCycle: 'h23',
        });
        const parts = formatter.formatToParts(date);
        const value = (type: Intl.DateTimeFormatPartTypes) =>
            Number(parts.find((part) => part.type === type)?.value);

        return {
            year: value('year'),
            month: value('month'),
            day: value('day'),
            hour: value('hour'),
            minute: value('minute'),
            second: value('second'),
        };
    }

    private async getOwnedOrderForUpdate(
        manager: EntityManager,
        id: string,
        userId: string,
    ): Promise<Order> {
        const order = await manager.findOne(Order, {
            where: { id, user_id: userId },
            lock: { mode: 'pessimistic_write' },
        });
        if (!order) throw new NotFoundException(`${DEFAULT_MESSAGES.ORDER.NOT_FOUND}: ${id}`);

        return order;
    }

    private async getOfferForUpdate(manager: EntityManager, offerId: string): Promise<Offer> {
        const offer = await manager.findOne(Offer, {
            where: { id: offerId },
            lock: { mode: 'pessimistic_write' },
        });
        if (!offer) throw new NotFoundException(`${DEFAULT_MESSAGES.OFFER.NOT_FOUND}: ${offerId}`);

        return offer;
    }

    private isHoldExpired(order: Order): boolean {
        return Boolean(order.hold_expires_at && order.hold_expires_at.getTime() <= Date.now());
    }

    private async restoreExpiredHold(manager: EntityManager, order: Order): Promise<Order> {
        const previousStatus = order.status;
        const previousPaymentStatus = order.payment_status;
        const offer = await this.getOfferForUpdate(manager, order.offer_id);

        this.restoreOfferQuantity(offer, order.quantity);
        order.status = OrderStatus.EXPIRED;
        order.expired_at = new Date();
        (order as any).hold_expires_at = null;

        await manager.save(offer);
        const saved = await manager.save(Order, order);
        await this.recordOrderEvent(manager, {
            orderId: saved.id,
            fromStatus: previousStatus,
            toStatus: saved.status,
            fromPaymentStatus: previousPaymentStatus,
            toPaymentStatus: saved.payment_status,
            actorType: 'SYSTEM',
            note: 'Hold expired and reserved quantity was restored.',
        });
        await this.userStatisticsService.rebuildForUser(manager, saved.user_id);

        return saved;
    }

    private async markOrderNoShow(
        manager: EntityManager,
        order: Order,
        noShowGraceMinutes: number,
    ): Promise<Order> {
        const previousStatus = order.status;
        const previousPaymentStatus = order.payment_status;
        const now = new Date();

        order.status = OrderStatus.NO_SHOW;
        order.no_show_at = now;

        const saved = await manager.save(Order, order);
        await this.recordOrderEvent(manager, {
            orderId: saved.id,
            fromStatus: previousStatus,
            toStatus: saved.status,
            fromPaymentStatus: previousPaymentStatus,
            toPaymentStatus: saved.payment_status,
            actorType: 'SYSTEM',
            note: `Pickup window ended at least ${noShowGraceMinutes} minute(s) ago; order marked no-show.`,
        });
        await this.userStatisticsService.rebuildForUser(manager, saved.user_id);

        return saved;
    }

    private restoreOfferQuantity(offer: Offer, quantity: number): void {
        offer.quantity_remaining += quantity;
        offer.quantity_reserved = Math.max(offer.quantity_reserved - quantity, 0);
    }

    private restoreSoldOfferQuantity(offer: Offer, quantity: number, totalAmountMinor: number): void {
        const maxRestorableRemaining = Math.max(offer.quantity_total - offer.quantity_reserved, 0);
        offer.quantity_remaining = Math.min(offer.quantity_remaining + quantity, maxRestorableRemaining);
    }

    private getPaymentOutcome(paymentResult: {
        payment: { status: PaymentStatus; provider_response_code?: string | null; provider_error_code?: string | null };
        providerStatusCode: number | null;
    }): 'success' | 'pending' | 'rejected' | 'failed' | 'unknown' {
        if (paymentResult.payment.status === PaymentStatus.CONFIRMED) {
            return 'success';
        }
        if (paymentResult.payment.status === PaymentStatus.PROCESSING) {
            return 'pending';
        }
        if (paymentResult.payment.status === PaymentStatus.REJECTED) {
            return 'rejected';
        }
        if (paymentResult.providerStatusCode == null &&
            !paymentResult.payment.provider_response_code &&
            !paymentResult.payment.provider_error_code) {
            return 'unknown';
        }
        return 'failed';
    }

    private getPaymentOutcomeMessage(
        outcome: 'success' | 'pending' | 'rejected' | 'failed' | 'unknown',
        fallback?: string,
    ): string {
        switch (outcome) {
            case 'success':
                return DEFAULT_MESSAGES.PAYMENT.APPROVED;
            case 'pending':
                return DEFAULT_MESSAGES.PAYMENT.PENDING;
            case 'rejected':
                return 'Payment was rejected by the customer.';
            case 'unknown':
                return 'We could not confirm the payment status. Please refresh the order.';
            case 'failed':
            default:
                return fallback || 'Payment failed. Please check your account balance or PIN and try again.';
        }
    }

    private applySimpleRefund(order: Order): void {
        if (
            order.payment_status === PaymentStatus.CONFIRMED ||
            order.payment_status === PaymentStatus.PROCESSING
        ) {
            order.payment_status = PaymentStatus.REFUNDED;
        }
    }

    private async recordOrderEvent(
        manager: EntityManager,
        params: {
            orderId: string;
            fromStatus?: OrderStatus;
            toStatus: OrderStatus;
            fromPaymentStatus?: PaymentStatus;
            toPaymentStatus?: PaymentStatus;
            actorType: 'USER' | 'STAFF' | 'SYSTEM';
            actorId?: string;
            actorName?: string;
            note?: string;
        },
    ): Promise<void> {
        const event = this.orderEventsRepository.create({
            order_id: params.orderId,
            from_status: params.fromStatus,
            to_status: params.toStatus,
            from_payment_status: params.fromPaymentStatus,
            to_payment_status: params.toPaymentStatus,
            actor_type: params.actorType,
            actor_id: params.actorId,
            actor_name: params.actorName,
            note: params.note,
        });

        await manager.save(OrderEvent, event);
    }

    private createUserOrderQuery(): SelectQueryBuilder<Order> {
        return this.ordersRepository
            .createQueryBuilder('ord')
            .leftJoinAndSelect('ord.offer', 'offer')
            .leftJoinAndSelect('ord.business', 'business')
            .select([
                'ord.id',
                'ord.order_number',
                'ord.pickup_code',
                'ord.user_id',
                'ord.business_id',
                'ord.offer_id',
                'ord.quantity',
                'ord.unit_price_minor',
                'ord.subtotal_minor',
                'ord.tax_minor',
                'ord.discount_minor',
                'ord.total_amount_minor',
                'ord.status',
                'ord.payment_status',
                'ord.hold_expires_at',
                'ord.reserved_at',
                'ord.confirmed_at',
                'ord.paid_at',
                'ord.ready_for_pickup_at',
                'ord.collected_at',
                'ord.cancelled_at',
                'ord.expired_at',
                'ord.pickup_time',
                'ord.payment_method',
                'ord.payment_provider',
                'ord.payment_intent_id',
                'ord.payment_transaction_id',
                'ord.cancellation_reason',
                'ord.has_user_reviewed',
                'ord.created_at',
                'offer.id',
                'offer.title',
                'offer.main_image_url',
                'offer.pickup_start',
                'offer.pickup_end',
                'business.id',
                'business.display_name',
                'business.logo_url',
            ]);
    }

}
