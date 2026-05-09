import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus, PaymentProvider, PaymentStatus, PayoutMethod, ReviewStatus } from '../../../common/entities/enums/all.enums';
import { Order } from '../entities/order.entity';

type TimelineKey =
    | 'reserved'
    | 'payment_requested'
    | 'paid'
    | 'ready_for_pickup'
    | 'collected'
    | 'cancelled'
    | 'expired';

export class OrderBusinessSummaryDto {
    @ApiProperty()
    businessId!: string;

    @ApiProperty()
    businessName!: string;

    @ApiPropertyOptional()
    logoUrl?: string;
}

export class OrderOfferSummaryDto {
    @ApiProperty()
    offerId!: string;

    @ApiProperty()
    title!: string;

    @ApiPropertyOptional()
    imageUrl?: string;

    @ApiPropertyOptional()
    pickupStart?: string;

    @ApiPropertyOptional()
    pickupEnd?: string;
}

export class OrderPaymentSummaryDto {
    @ApiProperty({ enum: PaymentStatus })
    status!: PaymentStatus;

    @ApiProperty({ enum: PaymentStatus })
    normalizedStatus!: PaymentStatus;

    @ApiPropertyOptional({ enum: PaymentProvider })
    provider?: PaymentProvider;

    @ApiPropertyOptional({ enum: PayoutMethod })
    method?: PayoutMethod;

    @ApiProperty()
    amount!: number;

    @ApiPropertyOptional()
    accountNoMasked?: string;

    @ApiPropertyOptional()
    requestId?: string;

    @ApiPropertyOptional()
    referenceId?: string;

    @ApiPropertyOptional()
    transactionId?: string;

    @ApiProperty()
    canRetry!: boolean;

    @ApiProperty()
    isPaid!: boolean;
}

export class OrderReviewSummaryDto {
    @ApiProperty()
    eligible!: boolean;

    @ApiProperty()
    submitted!: boolean;

    @ApiPropertyOptional({ enum: ReviewStatus })
    status?: ReviewStatus;
}

export class OrderTimelineEntryDto {
    @ApiProperty()
    key!: TimelineKey;

    @ApiProperty()
    label!: string;

    @ApiProperty()
    happenedAt!: string;
}

const toMoney = (amount: number | null | undefined): number =>
    Number(((amount ?? 0) / 100).toFixed(2));

const normalizeOrderStatus = (status: OrderStatus): OrderStatus => {
    if (status === OrderStatus.CANCELLED_BY_ADMIN || status === OrderStatus.CANCELLED_BY_USER) {
        return OrderStatus.CANCELLED;
    }

    return status;
};

const normalizePaymentStatus = (status: PaymentStatus): PaymentStatus => {
    if (status === PaymentStatus.INITIATED) {
        return PaymentStatus.PROCESSING;
    }

    return status;
};

const isPaymentRetryable = (status: PaymentStatus): boolean =>
    [PaymentStatus.FAILED, PaymentStatus.REJECTED].includes(status);

const buildTimeline = (order: Order): OrderTimelineEntryDto[] => {
    const items: Array<{ key: TimelineKey; label: string; date?: Date | null }> = [
        { key: 'reserved', label: 'Reserved', date: order.reserved_at ?? order.created_at },
        { key: 'payment_requested', label: 'Payment requested', date: order.confirmed_at && order.payment_status !== PaymentStatus.PENDING ? order.confirmed_at : order.paid_at },
        { key: 'paid', label: 'Payment approved', date: order.paid_at },
        { key: 'ready_for_pickup', label: 'Ready for pickup', date: order.ready_for_pickup_at },
        { key: 'collected', label: 'Collected', date: order.collected_at },
        { key: 'cancelled', label: 'Cancelled', date: order.cancelled_at },
        { key: 'expired', label: 'Expired', date: order.expired_at },
    ];

    return items
        .filter((item): item is { key: TimelineKey; label: string; date: Date } => Boolean(item.date))
        .map((item) => ({
            key: item.key,
            label: item.label,
            happenedAt: item.date.toISOString(),
        }));
};

export class OrderResponseDto {
    @ApiProperty()
    id!: string;

    @ApiProperty()
    orderId!: string;

    @ApiProperty()
    order_number!: string;

    @ApiProperty()
    orderNumber!: string;

    @ApiProperty()
    pickup_code!: string;

    @ApiProperty()
    pickupCode!: string;

    @ApiProperty()
    user_id!: string;

    @ApiProperty()
    business_id!: string;

    @ApiProperty()
    businessId!: string;

    @ApiProperty()
    offer_id!: string;

    @ApiProperty()
    offerId!: string;

    @ApiProperty()
    quantity!: number;

    @ApiProperty()
    unit_price_minor!: number;

    @ApiProperty()
    subtotal_minor!: number;

    @ApiProperty()
    tax_minor!: number;

    @ApiProperty()
    discount_minor!: number;

    @ApiProperty()
    total_amount_minor!: number;

    @ApiProperty({ enum: OrderStatus })
    status!: OrderStatus;

    @ApiProperty({ enum: OrderStatus })
    normalizedStatus!: OrderStatus;

    @ApiProperty({ enum: PaymentStatus })
    payment_status!: PaymentStatus;

    @ApiProperty({ enum: PaymentStatus })
    normalizedPaymentStatus!: PaymentStatus;

    @ApiPropertyOptional()
    hold_expires_at?: Date | null;

    @ApiPropertyOptional()
    pickup_time?: Date | null;

    @ApiPropertyOptional()
    reservedAt?: string;

    @ApiPropertyOptional()
    paidAt?: string;

    @ApiPropertyOptional()
    collectedAt?: string;

    @ApiPropertyOptional()
    cancelledAt?: string;

    @ApiPropertyOptional()
    expiredAt?: string;

    @ApiPropertyOptional()
    created_at!: Date;

    @ApiProperty()
    business!: OrderBusinessSummaryDto | null;

    @ApiProperty()
    offer!: OrderOfferSummaryDto | null;

    @ApiProperty()
    payment!: OrderPaymentSummaryDto;

    @ApiProperty()
    review!: OrderReviewSummaryDto;

    @ApiProperty({ type: [OrderTimelineEntryDto] })
    timeline!: OrderTimelineEntryDto[];

    @ApiProperty()
    canMarkPaid!: boolean;

    @ApiProperty()
    canCancelReservation!: boolean;

    static fromEntity(order: Order): OrderResponseDto {
        const normalizedStatus = normalizeOrderStatus(order.status);
        const normalizedPaymentStatus = normalizePaymentStatus(order.payment_status);

        return {
            id: order.id,
            orderId: order.id,
            order_number: order.order_number,
            orderNumber: order.order_number,
            pickup_code: order.pickup_code,
            pickupCode: order.pickup_code,
            user_id: order.user_id,
            business_id: order.business_id,
            businessId: order.business_id,
            offer_id: order.offer_id,
            offerId: order.offer_id,
            quantity: order.quantity,
            unit_price_minor: toMoney(order.unit_price_minor),
            subtotal_minor: toMoney(order.subtotal_minor),
            tax_minor: toMoney(order.tax_minor),
            discount_minor: toMoney(order.discount_minor),
            total_amount_minor: toMoney(order.total_amount_minor),
            status: order.status,
            normalizedStatus,
            payment_status: order.payment_status,
            normalizedPaymentStatus,
            hold_expires_at: order.hold_expires_at,
            pickup_time: order.pickup_time,
            reservedAt: order.reserved_at?.toISOString(),
            paidAt: order.paid_at?.toISOString(),
            collectedAt: order.collected_at?.toISOString(),
            cancelledAt: order.cancelled_at?.toISOString(),
            expiredAt: order.expired_at?.toISOString(),
            created_at: order.created_at,
            business: order.business
                ? {
                    businessId: order.business.id,
                    businessName: order.business.display_name,
                    logoUrl: order.business.logo_url ?? undefined,
                }
                : null,
            offer: order.offer
                ? {
                    offerId: order.offer.id,
                    title: order.offer.title,
                    imageUrl: order.offer.main_image_url ?? undefined,
                    pickupStart: order.offer.pickup_start?.toISOString(),
                    pickupEnd: order.offer.pickup_end?.toISOString(),
                }
                : null,
            payment: {
                status: order.payment_status,
                normalizedStatus: normalizedPaymentStatus,
                provider: order.payment_provider,
                method: order.payment_method,
                amount: toMoney(order.total_amount_minor),
                requestId: order.payment_intent_id,
                referenceId: order.order_number,
                transactionId: order.payment_transaction_id,
                canRetry: isPaymentRetryable(order.payment_status),
                isPaid: order.payment_status === PaymentStatus.CONFIRMED,
            },
            review: {
                eligible: normalizedStatus === OrderStatus.COLLECTED,
                submitted: Boolean(order.has_user_reviewed),
                status: order.has_user_reviewed ? ReviewStatus.PENDING : undefined,
            },
            timeline: buildTimeline(order),
            canMarkPaid: [OrderStatus.HOLD, OrderStatus.PENDING_PAYMENT].includes(order.status),
            canCancelReservation: [OrderStatus.HOLD, OrderStatus.PENDING_PAYMENT].includes(order.status),
        };
    }
}

export class MobileUserOrderDto {
    @ApiProperty()
    orderId!: string;

    @ApiProperty()
    orderNumber!: string;

    @ApiProperty()
    quantity!: number;

    @ApiProperty()
    amount!: number;

    @ApiProperty({ enum: OrderStatus })
    status!: OrderStatus;

    @ApiProperty({ enum: OrderStatus })
    normalizedStatus!: OrderStatus;

    @ApiProperty({ enum: PaymentStatus })
    paymentStatus!: PaymentStatus;

    @ApiProperty({ enum: PaymentStatus })
    normalizedPaymentStatus!: PaymentStatus;

    @ApiPropertyOptional()
    reservedAt?: string;

    @ApiPropertyOptional()
    completedAt?: string;

    @ApiProperty()
    pinCode!: string;

    @ApiPropertyOptional()
    paymentMethod?: string;

    @ApiPropertyOptional()
    cancellationReason?: string;

    @ApiProperty()
    package!: OrderOfferSummaryDto | null;

    @ApiProperty()
    business!: OrderBusinessSummaryDto | null;

    @ApiProperty()
    hasUserReviewedBusiness!: boolean;

    @ApiProperty()
    review!: OrderReviewSummaryDto;

    @ApiProperty()
    payment!: OrderPaymentSummaryDto;

    @ApiProperty()
    actions!: {
        canPay: boolean;
        canReview: boolean;
        canCancelReservation: boolean;
    };

    static fromEntity(order: Order): MobileUserOrderDto {
        const normalizedStatus = normalizeOrderStatus(order.status);
        const normalizedPaymentStatus = normalizePaymentStatus(order.payment_status);

        return {
            orderId: order.id,
            orderNumber: order.order_number,
            quantity: order.quantity,
            amount: toMoney(order.total_amount_minor),
            status: order.status,
            normalizedStatus,
            paymentStatus: order.payment_status,
            normalizedPaymentStatus,
            reservedAt: order.reserved_at?.toISOString() ?? order.created_at.toISOString(),
            completedAt:
                order.collected_at?.toISOString() ??
                order.cancelled_at?.toISOString() ??
                order.expired_at?.toISOString(),
            pinCode: order.pickup_code,
            paymentMethod: order.payment_method ?? undefined,
            cancellationReason: order.cancellation_reason ?? undefined,
            package: order.offer
                ? {
                    offerId: order.offer.id,
                    title: order.offer.title,
                    imageUrl: order.offer.main_image_url ?? undefined,
                    pickupStart: order.offer.pickup_start?.toISOString(),
                    pickupEnd: order.offer.pickup_end?.toISOString(),
                }
                : null,
            business: order.business
                ? {
                    businessId: order.business.id,
                    businessName: order.business.display_name,
                    logoUrl: order.business.logo_url ?? undefined,
                }
                : null,
            hasUserReviewedBusiness: Boolean(order.has_user_reviewed),
            review: {
                eligible: normalizedStatus === OrderStatus.COLLECTED,
                submitted: Boolean(order.has_user_reviewed),
                status: order.has_user_reviewed ? ReviewStatus.PENDING : undefined,
            },
            payment: {
                status: order.payment_status,
                normalizedStatus: normalizedPaymentStatus,
                provider: order.payment_provider,
                method: order.payment_method,
                amount: toMoney(order.total_amount_minor),
                requestId: order.payment_intent_id,
                referenceId: order.order_number,
                transactionId: order.payment_transaction_id,
                canRetry: isPaymentRetryable(order.payment_status),
                isPaid: order.payment_status === PaymentStatus.CONFIRMED,
            },
            actions: {
                canPay: [OrderStatus.HOLD, OrderStatus.PENDING_PAYMENT].includes(order.status),
                canReview: normalizedStatus === OrderStatus.COLLECTED && !order.has_user_reviewed,
                canCancelReservation: [OrderStatus.HOLD, OrderStatus.PENDING_PAYMENT].includes(order.status),
            },
        };
    }
}
