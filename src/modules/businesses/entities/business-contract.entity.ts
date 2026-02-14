import { Entity, Column, Unique, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Business } from './business.entity';
import { PayoutSchedule } from '../../../common/entities/enums/all.enums';

@Entity('business_contracts')
export class BusinessContract extends BaseEntity {
    @Column({ type: 'uuid' })
    business_id: string;

    @ManyToOne(() => Business, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'business_id' })
    business: Business;

    @Column({ length: 50, unique: true })
    contract_number: string;

    @Column({ length: 20 })
    version: string;

    @Column({ default: false })
    is_signed: boolean;

    @Column({ type: 'timestamptz', nullable: true })
    signed_at: Date;

    @Column({ type: 'inet', nullable: true })
    signed_by_ip: string;

    @Column({ type: 'text', nullable: true })
    agreement_pdf_url: string;

    @Column({ type: 'enum', enum: PayoutSchedule, default: PayoutSchedule.WEEKLY })
    payout_schedule: PayoutSchedule;

    @Column({ type: 'int', default: 1000 })
    commission_rate_bps: number;

    @Column({ type: 'bigint', default: 0 })
    fixed_commission_minor: number;

    @Column({ type: 'bigint', default: 1000 })
    minimum_payout_minor: number;

    @Column({ type: 'timestamptz', default: () => 'NOW()' })
    effective_from: Date;

    @Column({ type: 'timestamptz', nullable: true })
    effective_to: Date;

    @Column({ default: true })
    auto_renew: boolean;

    @Column({ default: true })
    is_active: boolean;

    @Column({ type: 'timestamptz', nullable: true })
    terminated_at: Date;

    @Column({ type: 'text', nullable: true })
    termination_reason: string;
}
