import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Business } from '../../businesses/entities/business.entity';
import { BusinessContract } from '../../businesses/entities/business-contract.entity';
import { StaffUser } from '../../staff/entities/staff-user.entity';
import {
    PayoutStatus,
    PayoutMethod,
} from '../../../common/entities/enums/all.enums';

@Entity('payouts')
@Index('idx_payouts_business', ['business_id'])
@Index('idx_payouts_status', ['status'])
@Index('idx_payouts_period', ['period_start', 'period_end'])
@Index('idx_payouts_scheduled', ['scheduled_for'])
export class Payout extends BaseEntity {
    @Column({ length: 50, unique: true })
    payout_number: string;

    @Column({ type: 'uuid' })
    business_id: string;

    @ManyToOne(() => Business)
    @JoinColumn({ name: 'business_id' })
    business: Business;

    @Column({ type: 'uuid', nullable: true })
    contract_id: string;

    @ManyToOne(() => BusinessContract, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'contract_id' })
    contract: BusinessContract;

    @Column({ type: 'uuid', nullable: true })
    processed_by: string;

    @ManyToOne(() => StaffUser, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'processed_by' })
    processor: StaffUser;

    @Column({ type: 'date' })
    period_start: Date;

    @Column({ type: 'date' })
    period_end: Date;

    @Column({ type: 'char', length: 3 })
    currency_code: string;

    @Column({ type: 'bigint', default: 0 })
    gross_amount_minor: number;

    @Column({ type: 'bigint', default: 0 })
    commission_amount_minor: number;

    @Column({ type: 'bigint', default: 0 })
    fee_amount_minor: number;

    @Column({
        type: 'bigint',
        generatedType: 'STORED',
        asExpression: 'gross_amount_minor - commission_amount_minor - fee_amount_minor',
    })
    net_amount_minor: number;

    @Column({ type: 'enum', enum: PayoutStatus, default: PayoutStatus.DRAFT })
    status: PayoutStatus;

    @Column({ type: 'enum', enum: PayoutMethod, nullable: true })
    payment_method: PayoutMethod;

    @Column({ length: 255, nullable: true })
    payment_reference: string;

    @Column({ type: 'date', nullable: true })
    scheduled_for: Date;

    @Column({ type: 'timestamptz', nullable: true })
    processed_at: Date;

    @Column({ type: 'timestamptz', nullable: true })
    paid_at: Date;

    @Column({ type: 'timestamptz', nullable: true })
    failed_at: Date;

    @Column({ type: 'text', nullable: true })
    failure_reason: string;

    @Column({ type: 'text', nullable: true })
    notes: string;
}
