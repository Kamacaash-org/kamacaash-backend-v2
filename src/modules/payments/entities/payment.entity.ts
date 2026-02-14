import { Entity, Column, Index, OneToOne, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Order } from '../../orders/entities/order.entity';
import { AppUser } from '../../users/entities/app-user.entity';
import { Business } from '../../businesses/entities/business.entity';
import {
    PaymentStatus,
    PaymentProvider,
} from '../../../common/entities/enums/all.enums';

@Entity('payments')
@Index('idx_payments_order', ['order_id'])
@Index('idx_payments_user', ['user_id'])
@Index('idx_payments_business', ['business_id'])
@Index('idx_payments_status', ['status'])
@Index('idx_payments_provider', ['provider', 'provider_transaction_id'])
export class Payment extends BaseEntity {
    @Column({ length: 50, unique: true })
    payment_number: string;

    @Column({ type: 'uuid' })
    order_id: string;

    @OneToOne(() => Order)
    @JoinColumn({ name: 'order_id' })
    order: Order;

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

    @Column({ type: 'int' })
    amount_minor: number;

    @Column({ type: 'char', length: 3 })
    currency_code: string;

    @Column({ type: 'enum', enum: PaymentProvider })
    provider: PaymentProvider;

    @Column({ length: 255, nullable: true })
    provider_transaction_id: string;

    @Column({ length: 255, nullable: true })
    provider_reference: string;

    @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
    status: PaymentStatus;

    @Column({ type: 'int' })
    subtotal_minor: number;

    @Column({ type: 'int', default: 0 })
    tax_minor: number;

    @Column({ type: 'int', default: 0 })
    platform_fee_minor: number;

    @Column({
        type: 'int',
        generatedType: 'STORED',
        asExpression: 'amount_minor - platform_fee_minor',
    })
    business_payout_minor: number;

    @Column({ type: 'jsonb', nullable: true })
    payment_method_details: Record<string, any>;

    @Column({ length: 4, nullable: true })
    card_last_four: string;

    @Column({ length: 50, nullable: true })
    mobile_money_number: string;

    @Column({ type: 'timestamptz', nullable: true })
    paid_at: Date;

    @Column({ type: 'timestamptz', nullable: true })
    failed_at: Date;

    @Column({ type: 'text', nullable: true })
    failure_reason: string;

    @Column({ type: 'timestamptz', nullable: true })
    refunded_at: Date;

    @Column({ type: 'int', nullable: true })
    refund_amount_minor: number;

    @Column({ type: 'text', nullable: true })
    refund_reason: string;

    @Column({ type: 'jsonb', nullable: true })
    provider_request: Record<string, any>;

    @Column({ type: 'jsonb', nullable: true })
    provider_response: Record<string, any>;

    @Column({ type: 'jsonb', nullable: true })
    provider_webhook_data: Record<string, any>;
}
