import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Business } from './business.entity';
import { AppUser } from '../../users/entities/app-user.entity';
import { StaffUser } from '../../staff/entities/staff-user.entity';

@Entity('business_staff')
@Index('idx_staff_business', ['business_id'])
@Index('idx_staff_active', ['business_id', 'is_active'])
export class BusinessStaff extends BaseEntity {
    @Column({ type: 'uuid' })
    business_id: string;

    @ManyToOne(() => Business, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'business_id' })
    business: Business;

    @Column({ type: 'uuid', nullable: true })
    user_id: string;

    @ManyToOne(() => AppUser, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'user_id' })
    user: AppUser;

    @Column({ type: 'uuid', nullable: true })
    staff_user_id: string;

    @ManyToOne(() => StaffUser, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'staff_user_id' })
    staff_user: StaffUser;

    @Column({ length: 255 })
    name: string;

    @Column({ length: 255, nullable: true })
    email: string;

    @Column({ length: 50, nullable: true })
    phone_e164: string;

    @Column({ length: 100 })
    role: string;

    @Column({ type: 'text', array: true, default: [] })
    permissions: string[];

    @Column({ default: false })
    is_owner: boolean;

    @Column({ default: true })
    is_active: boolean;

    @Column({ type: 'timestamptz', nullable: true })
    invited_at: Date;

    @Column({ type: 'uuid', nullable: true })
    invited_by: string;

    @Column({ type: 'timestamptz', nullable: true })
    accepted_at: Date;

    @Column({ type: 'timestamptz', nullable: true })
    last_active_at: Date;
}
