import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { AppUser } from '../../users/entities/app-user.entity';
import { Business } from '../../businesses/entities/business.entity';
import { StaffUser } from '../../staff/entities/staff-user.entity';
import { NotificationType } from '../../../common/entities/enums/all.enums';

@Entity('notifications')
@Index('idx_notifications_user', ['user_id', 'status'])
@Index('idx_notifications_business', ['business_id', 'status'])
@Index('idx_notifications_retry', ['next_retry_at'])
export class Notification extends BaseEntity {
    @Column({ type: 'uuid', nullable: true })
    user_id: string;

    @ManyToOne(() => AppUser, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: AppUser;

    @Column({ type: 'uuid', nullable: true })
    business_id: string;

    @ManyToOne(() => Business, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'business_id' })
    business: Business;

    @Column({ type: 'uuid', nullable: true })
    staff_user_id: string;

    @ManyToOne(() => StaffUser, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'staff_user_id' })
    staff_user: StaffUser;

    @Column({ type: 'enum', enum: NotificationType })
    type: NotificationType;

    @Column({ length: 50 })
    channel: string;

    @Column({ length: 20, default: 'MEDIUM' })
    priority: string;

    @Column({ length: 255 })
    title: string;

    @Column({ type: 'text' })
    body: string;

    @Column({ type: 'jsonb', default: {} })
    data: Record<string, any>;

    @Column({ length: 100, nullable: true })
    template_id: string;

    @Column({ length: 50, default: 'PENDING' })
    status: string;

    @Column({ type: 'timestamptz', nullable: true })
    sent_at: Date;

    @Column({ type: 'timestamptz', nullable: true })
    delivered_at: Date;

    @Column({ type: 'timestamptz', nullable: true })
    read_at: Date;

    @Column({ type: 'timestamptz', nullable: true })
    failed_at: Date;

    @Column({ type: 'text', nullable: true })
    failure_reason: string;

    @Column({ length: 255, nullable: true })
    from_address: string;

    @Column({ length: 255 })
    to_address: string;

    @Column({ length: 255, nullable: true })
    subject: string;

    @Column({ type: 'int', default: 0 })
    retry_count: number;

    @Column({ type: 'int', default: 3 })
    max_retries: number;

    @Column({ type: 'timestamptz', nullable: true })
    next_retry_at: Date;
}
