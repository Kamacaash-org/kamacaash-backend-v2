import { Entity, Column, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Order } from '../../orders/entities/order.entity';
import { AppUser } from '../../users/entities/app-user.entity';
import { Business } from '../../businesses/entities/business.entity';
import {
    PaymentStatus,
    PaymentProvider,
    PayoutMethod,
} from '../../../common/entities/enums/all.enums';
import { PaymentLog } from './payment-log.entity';
import { PaymentEvent } from './payment-event.entity';

@Entity('payments')
@Index(['provider', 'request_id'], { unique: true })
@Index(['provider', 'reference_id'])
@Index(['order_id', 'provider'])
export class Payment extends BaseEntity {
    @Column({ type: 'varchar', length: 50, unique: true })
    payment_number!: string;

    @Column({ type: 'uuid' })
    order_id!: string;

    @ManyToOne(() => Order, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'order_id' })
    order!: Order;

    @Column({ type: 'uuid' })
    user_id!: string;

    @ManyToOne(() => AppUser)
    @JoinColumn({ name: 'user_id' })
    user!: AppUser;

    @Column({ type: 'uuid' })
    business_id!: string;

    @ManyToOne(() => Business)
    @JoinColumn({ name: 'business_id' })
    business!: Business;

    @Column({ type: 'int' })
    amount_minor!: number;

    @Column({ type: 'char', length: 3 })
    currency_code!: string;

    @Column({ type: 'enum', enum: PaymentProvider })
    provider!: PaymentProvider;

    @Column({ type: 'varchar', length: 255, nullable: true })
    provider_transaction_id!: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    issuer_transaction_id!: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    reference_id!: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    request_id!: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    invoice_id!: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    provider_reference!: string | null;

    @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.INITIATED })
    status!: PaymentStatus;

    @Column({ type: 'varchar', length: 255, nullable: true })
    provider_status!: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    provider_response_code!: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    provider_error_code!: string | null;

    @Column({ type: 'text', nullable: true })
    description!: string | null;

    @Column({ type: 'enum', enum: PayoutMethod, nullable: true })
    payment_method!: PayoutMethod | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    provider_payment_method!: string | null;

    @Column({ type: 'varchar', length: 50, nullable: true })
    account_no!: string | null;

    @Column({ type: 'varchar', length: 50, nullable: true })
    account_no_masked!: string | null;

    @Column({ type: 'int' })
    subtotal_minor!: number;

    @Column({ type: 'int', default: 0 })
    tax_minor!: number;

    @Column({ type: 'int', default: 0 })
    platform_fee_minor!: number;

    @Column({
        type: 'int',
        generatedType: 'STORED',
        asExpression: 'amount_minor - platform_fee_minor',
    })
    business_payout_minor!: number;

    @Column({ type: 'jsonb', nullable: true })
    payment_method_details!: Record<string, any>;

    @Column({ type: 'varchar', length: 4, nullable: true })
    card_last_four!: string | null;

    @Column({ type: 'varchar', length: 50, nullable: true })
    mobile_money_number!: string | null;

    @Column({ type: 'timestamptz', nullable: true })
    paid_at!: Date | null;

    @Column({ type: 'timestamptz', nullable: true })
    failed_at!: Date | null;

    @Column({ type: 'text', nullable: true })
    failure_reason!: string | null;

    @Column({ type: 'timestamptz', nullable: true })
    refunded_at!: Date | null;

    @Column({ type: 'int', nullable: true })
    refund_amount_minor!: number | null;

    @Column({ type: 'text', nullable: true })
    refund_reason!: string | null;

    @Column({ type: 'jsonb', nullable: true })
    provider_request!: Record<string, any>;

    @Column({ type: 'jsonb', nullable: true })
    provider_response!: Record<string, any>;

    @Column({ type: 'jsonb', nullable: true })
    provider_webhook_data!: Record<string, any>;

    @Column({ type: 'jsonb', nullable: true })
    raw_response!: Record<string, any>;

    @OneToMany(() => PaymentLog, (paymentLog) => paymentLog.payment)
    logs!: PaymentLog[];

    @OneToMany(() => PaymentEvent, (paymentEvent) => paymentEvent.payment)
    events!: PaymentEvent[];
}
