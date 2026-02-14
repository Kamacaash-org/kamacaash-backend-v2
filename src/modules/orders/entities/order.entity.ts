import {
    Entity,
    Column,
    Index,
    ManyToOne,
    JoinColumn,
    OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { AppUser } from '../../users/entities/app-user.entity';
import { Business } from '../../businesses/entities/business.entity';
import { Offer } from '../../offers/entities/offer.entity';
import { StaffUser } from '../../staff/entities/staff-user.entity';
import {
    OrderStatus,
    PaymentStatus,
    PayoutMethod,
    PaymentProvider,
} from '../../../common/entities/enums/all.enums';

@Entity('orders')
@Index('idx_orders_user', ['user_id'])
@Index('idx_orders_business', ['business_id'])
@Index('idx_orders_offer', ['offer_id'])
@Index('idx_orders_status', ['status'])
@Index('idx_orders_payment', ['payment_status'])
@Index('idx_orders_hold_expiry', ['status', 'hold_expires_at'])
@Index('idx_orders_pickup_code', ['pickup_code'])
@Index('idx_orders_pickup_time', ['pickup_time'])
export class Order extends BaseEntity {
    @Column({ length: 50, unique: true })
    order_number: string;

    @Column({ length: 10, unique: true })
    pickup_code: string;

    @Column({ type: 'uuid' })
    user_id: string;

    @ManyToOne(() => AppUser)
    @JoinColumn({ name: 'user_id' })
    user: AppUser;

    @Column({ type: 'uuid' })
    business_id: string;

    @ManyToOne(() => Business)
    @JoinColumn({ name: 'business_id' })
    business: Business;

    @Column({ type: 'uuid' })
    offer_id: string;

    @ManyToOne(() => Offer)
    @JoinColumn({ name: 'offer_id' })
    offer: Offer;

    @Column({ type: 'uuid', nullable: true })
    created_by_staff_id: string;

    @ManyToOne(() => StaffUser, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'created_by_staff_id' })
    created_by_staff: StaffUser;

    @Column({ type: 'int' })
    quantity: number;

    @Column({ type: 'int' })
    unit_price_minor: number;

    @Column({
        type: 'int',
        generatedType: 'STORED',
        asExpression: 'quantity * unit_price_minor',
    })
    subtotal_minor: number;

    @Column({ type: 'int', default: 0 })
    tax_minor: number;

    @Column({ type: 'int', default: 0 })
    discount_minor: number;

    @Column({
        type: 'int',
        generatedType: 'STORED',
        asExpression: 'quantity * unit_price_minor + tax_minor - discount_minor',
    })
    total_amount_minor: number;

    @Column({ type: 'char', length: 3 })
    currency_code: string;

    @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.HOLD })
    status: OrderStatus;

    @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
    payment_status: PaymentStatus;

    @Column({ type: 'timestamptz', nullable: true })
    hold_expires_at: Date;

    @Column({ type: 'timestamptz', default: () => 'NOW()' })
    reserved_at: Date;

    @Column({ type: 'timestamptz', nullable: true })
    confirmed_at: Date;

    @Column({ type: 'timestamptz', nullable: true })
    paid_at: Date;

    @Column({ type: 'timestamptz', nullable: true })
    ready_for_pickup_at: Date;

    @Column({ type: 'timestamptz', nullable: true })
    collected_at: Date;

    @Column({ type: 'timestamptz', nullable: true })
    cancelled_at: Date;

    @Column({ type: 'timestamptz', nullable: true })
    expired_at: Date;

    @Column({ type: 'timestamptz', nullable: true })
    pickup_time: Date;

    @Column({ type: 'uuid', nullable: true })
    pickup_verified_by: string;

    @ManyToOne(() => StaffUser, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'pickup_verified_by' })
    pickup_verifier: StaffUser;

    @Column({ type: 'timestamptz', nullable: true })
    pickup_verified_at: Date;

    @Column({ type: 'enum', enum: PayoutMethod, nullable: true })
    payment_method: PayoutMethod;

    @Column({ type: 'enum', enum: PaymentProvider, nullable: true })
    payment_provider: PaymentProvider;

    @Column({ length: 255, nullable: true })
    payment_intent_id: string;

    @Column({ length: 255, nullable: true })
    payment_transaction_id: string;

    @Column({ length: 255, nullable: true })
    customer_name: string;

    @Column({ length: 255, nullable: true })
    customer_email: string;

    @Column({ length: 50, nullable: true })
    customer_phone: string;

    @Column({ type: 'text', nullable: true })
    special_requests: string;

    @Column({ type: 'text', nullable: true })
    cancellation_reason: string;

    @Column({ type: 'timestamptz', nullable: true })
    confirmation_sent_at: Date;

    @Column({ type: 'timestamptz', nullable: true })
    reminder_sent_at: Date;

    @Column({ type: 'timestamptz', nullable: true })
    pickup_reminder_sent_at: Date;

    @Column({ default: false })
    has_user_reviewed: boolean;

    @Column({ type: 'inet', nullable: true })
    ip_address: string;

    @Column({ type: 'text', nullable: true })
    user_agent: string;
}
