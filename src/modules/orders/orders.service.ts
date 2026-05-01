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
import { OrderStatus, OfferStatus, PaymentStatus } from '../../common/entities/enums/all.enums';
import { ConfigService } from '@nestjs/config';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { DEFAULT_MESSAGES } from '../../common/constants/default-messages';
import { MobileUserOrderDto, OrderResponseDto } from './dto/order-response.dto';
import { AdminOrderResponseDto } from './dto/admin-order-response.dto';
import {
    ADMIN_PENDING_ORDER_STATUSES,
    ORDER_EXPIRY_JOB_INTERVAL_SECONDS,
    ORDER_HOLD_MINUTES,
    ORDER_NO_SHOW_GRACE_MINUTES,
} from '../../config/orders.config';
import { AdminCloseNoShowOrderDto } from './dto/admin-close-no-show-order.dto';

@Injectable()
export class OrdersService {
    private readonly logger = new Logger(OrdersService.name);
    private isRestoringExpiredHolds = false;
    private isMarkingNoShows = false;

    constructor(
        @InjectRepository(Order)
        private ordersRepository: Repository<Order>,
        @InjectRepository(OrderEvent)
        private orderEventsRepository: Repository<OrderEvent>,
        @InjectRepository(Business)
        private businessesRepository: Repository<Business>,
        private dataSource: DataSource,
        private configService: ConfigService,
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
            await this.syncUserStatistics(manager, saved.user_id);

            return saved;
        });

        const withRelations = await this.getOrderWithRelations(created.id);

        return ApiResponseDto.success(DEFAULT_MESSAGES.ORDER.CREATED, OrderResponseDto.fromEntity(withRelations));
    }

    async markPaid(
        id: string,
        userId: string,
        markOrderPaidDto: MarkOrderPaidDto,
    ): Promise<ApiResponseDto<OrderResponseDto>> {
        const result = await this.dataSource.transaction(async (manager: EntityManager) => {
            const order = await this.getOwnedOrderForUpdate(manager, id, userId);

            if (order.status === OrderStatus.PAID || order.payment_status === PaymentStatus.CONFIRMED) {
                throw new ConflictException(DEFAULT_MESSAGES.ORDER.ALREADY_PAID);
            }

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

            order.status = OrderStatus.PAID;
            order.payment_status = PaymentStatus.CONFIRMED;
            order.confirmed_at = order.confirmed_at ?? now;
            order.paid_at = now;
            (order as any).hold_expires_at = null;
            order.payment_provider = markOrderPaidDto.payment_provider ?? order.payment_provider;
            order.payment_method = markOrderPaidDto.payment_method ?? order.payment_method;
            order.payment_intent_id = markOrderPaidDto.payment_intent_id ?? order.payment_intent_id;
            order.payment_transaction_id =
                markOrderPaidDto.payment_transaction_id ?? order.payment_transaction_id;

            const offer = await this.getOfferForUpdate(manager, order.offer_id);
            offer.quantity_reserved = Math.max(offer.quantity_reserved - order.quantity, 0);
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
                note: 'Payment confirmed by app API.',
            });
            await this.syncUserStatistics(manager, saved.user_id);

            return { order: saved, wasExpired: false };
        });

        if (result.wasExpired) {
            throw new ConflictException(DEFAULT_MESSAGES.ORDER.HOLD_EXPIRED);
        }

        const withRelations = await this.getOrderWithRelations(result.order.id);
        return ApiResponseDto.success(DEFAULT_MESSAGES.ORDER.PAID, OrderResponseDto.fromEntity(withRelations));
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
            await this.syncUserStatistics(manager, saved.user_id);

            return { order: saved, wasExpired: false };
        });

        if (result.wasExpired) {
            throw new ConflictException(DEFAULT_MESSAGES.ORDER.HOLD_EXPIRED);
        }

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
        await this.dataSource.transaction(async (manager: EntityManager) => {
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
            await this.syncUserStatistics(manager, saved.user_id);

            return saved;
        });

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
        await this.dataSource.transaction(async (manager: EntityManager) => {
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
            await this.syncUserStatistics(manager, saved.user_id);

            return saved;
        });
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

    // @Interval(ORDER_EXPIRY_JOB_INTERVAL_SECONDS * 1000)
    // async restoreExpiredHoldOrders(): Promise<void> {
    //     if (this.isRestoringExpiredHolds) return;

    //     this.isRestoringExpiredHolds = true;
    //     try {
    //         const restoredCount = await this.dataSource.transaction(async (manager: EntityManager) => {
    //             const expiredOrders = await manager.find(Order, {
    //                 where: {
    //                     status: OrderStatus.HOLD,
    //                     hold_expires_at: LessThanOrEqual(new Date()),
    //                 },
    //                 order: { hold_expires_at: 'ASC' },
    //                 take: 100,
    //                 lock: { mode: 'pessimistic_write' },
    //             });

    //             for (const order of expiredOrders) {
    //                 await this.restoreExpiredHold(manager, order);
    //             }

    //             return expiredOrders.length;
    //         });

    //         if (restoredCount > 0) {
    //             this.logger.log(`Restored ${restoredCount} expired order hold(s).`);
    //         }
    //     } catch (error) {
    //         this.logger.error('Failed to restore expired order holds', error instanceof Error ? error.stack : error);
    //     } finally {
    //         this.isRestoringExpiredHolds = false;
    //     }
    // }

    // @Interval(ORDER_EXPIRY_JOB_INTERVAL_SECONDS * 1000)
    // async markNoShowOrders(): Promise<void> {
    //     if (this.isMarkingNoShows) return;

    //     this.isMarkingNoShows = true;
    //     try {
    //         const noShowCount = await this.dataSource.transaction(async (manager: EntityManager) => {
    //             const noShowGraceMinutes =
    //                 this.configService.get<number>('orders.noShowGraceMinutes') ?? ORDER_NO_SHOW_GRACE_MINUTES;
    //             const cutoff = new Date(Date.now() - noShowGraceMinutes * 60 * 1000);
    //             const orders = await manager
    //                 .createQueryBuilder(Order, 'order')
    //                 .innerJoinAndSelect('order.offer', 'offer')
    //                 .where('order.status IN (:...statuses)', {
    //                     statuses: [OrderStatus.PAID, OrderStatus.READY_FOR_PICKUP],
    //                 })
    //                 .andWhere('offer.pickup_end <= :cutoff', { cutoff })
    //                 .orderBy('offer.pickup_end', 'ASC')
    //                 .take(100)
    //                 .setLock('pessimistic_write')
    //                 .getMany();

    //             for (const order of orders) {
    //                 await this.markOrderNoShow(manager, order, noShowGraceMinutes);
    //             }

    //             return orders.length;
    //         });

    //         if (noShowCount > 0) {
    //             this.logger.log(`Marked ${noShowCount} order(s) as no-show.`);
    //         }
    //     } catch (error) {
    //         this.logger.error('Failed to mark no-show orders', error instanceof Error ? error.stack : error);
    //     } finally {
    //         this.isMarkingNoShows = false;
    //     }
    // }

    generateOrderNumber(): string {
        return `KAM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }

    generatePickupCode(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    async findAll(userId: string): Promise<ApiResponseDto<MobileUserOrderDto[]>> {
        const orders = await this.ordersRepository.find({
            where: { user_id: userId, status: In([OrderStatus.PAID, OrderStatus.COLLECTED, OrderStatus.NO_SHOW, OrderStatus.CANCELLED_BY_ADMIN, OrderStatus.CANCELLED_BY_USER]) },
            relations: ['offer', 'business'],
            order: { created_at: 'DESC' },
        });

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.ORDER.LIST_FETCHED,
            orders.map((order) => MobileUserOrderDto.fromEntity(order)),
        );
    }

    async findOne(id: string, userId: string): Promise<ApiResponseDto<OrderResponseDto>> {
        const order = await this.ordersRepository.findOne({
            where: { id, user_id: userId },
            relations: ['offer', 'business'],
        });
        if (!order) throw new NotFoundException(`${DEFAULT_MESSAGES.ORDER.NOT_FOUND}: ${id}`);

        return ApiResponseDto.success(DEFAULT_MESSAGES.ORDER.FETCHED, OrderResponseDto.fromEntity(order));
    }

    private async getOrderWithRelations(id: string): Promise<Order> {
        const order = await this.ordersRepository.findOne({
            where: { id },
            relations: ['offer', 'business'],
        });
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
        await this.syncUserStatistics(manager, saved.user_id);

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
        await this.syncUserStatistics(manager, saved.user_id);

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

    private async syncUserStatistics(manager: EntityManager, userId: string): Promise<void> {
        const stats = await manager
            .createQueryBuilder(Order, 'ord')
            .select('COUNT(ord.id)', 'total_orders')
            .addSelect(
                `COALESCE(SUM(CASE WHEN ord.status IN (:...completedStatuses) THEN 1 ELSE 0 END), 0)`,
                'total_completed_orders',
            )
            .addSelect(
                `COALESCE(SUM(CASE WHEN ord.status IN (:...cancelledStatuses) THEN 1 ELSE 0 END), 0)`,
                'total_cancelled_orders',
            )
            .addSelect('COALESCE(SUM(ord.discount_minor), 0)', 'total_saved_amount_minor')
            .addSelect(
                `COALESCE(SUM(CASE
                    WHEN ord.payment_status = :confirmedPaymentStatus
                        OR ord.status IN (:...paidStatuses)
                    THEN ord.total_amount_minor
                    ELSE 0
                END), 0)`,
                'total_spent_amount_minor',
            )
            .where('ord.user_id = :userId', { userId })
            .setParameters({
                completedStatuses: [OrderStatus.COLLECTED, OrderStatus.CLOSED],
                cancelledStatuses: [
                    OrderStatus.CANCELLED,
                    OrderStatus.CANCELLED_BY_USER,
                    OrderStatus.CANCELLED_BY_ADMIN,
                    OrderStatus.EXPIRED,
                    OrderStatus.NO_SHOW,
                ],
                paidStatuses: [
                    OrderStatus.PAID,
                    OrderStatus.READY_FOR_PICKUP,
                    OrderStatus.COLLECTED,
                    OrderStatus.CLOSED,
                ],
                confirmedPaymentStatus: PaymentStatus.CONFIRMED,
            })
            .getRawOne<{
                total_orders: string;
                total_completed_orders: string;
                total_cancelled_orders: string;
                total_saved_amount_minor: string;
                total_spent_amount_minor: string;
            }>();

        await manager.update(AppUser, { id: userId }, {
            total_orders: Number(stats?.total_orders ?? 0),
            total_completed_orders: Number(stats?.total_completed_orders ?? 0),
            total_cancelled_orders: Number(stats?.total_cancelled_orders ?? 0),
            total_saved_amount_minor: Number(stats?.total_saved_amount_minor ?? 0),
            total_spent_amount_minor: Number(stats?.total_spent_amount_minor ?? 0),
        });
    }
}
