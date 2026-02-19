import { Entity, Column, Unique, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Business } from './business.entity';

@Entity('business_bank_accounts')
export class BusinessBankAccount extends BaseEntity {
    @Column({ type: 'uuid' })
    business_id: string;

    @ManyToOne(() => Business, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'business_id' })
    business: Business;

    @Column({ length: 255 })
    account_holder_name: string;

    @Column({ length: 255 })
    bank_name: string;

    @Column({ length: 100 })
    account_number: string;

    @Column({ length: 50, nullable: true })
    sort_code: string;

    @Column({ length: 34, nullable: true })
    iban: string;

    @Column({ length: 11, nullable: true })
    swift_bic: string;

    @Column({ default: true })
    is_active: boolean;

    @Column({ default: false })
    is_verified: boolean;

    @Column({ type: 'timestamptz', nullable: true })
    verified_at: Date;
}
