import { Entity, Column, Index, ManyToOne, JoinColumn, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { AppUser } from '../../users/entities/app-user.entity';
import { StaffUser } from '../../staff/entities/staff-user.entity';
import { UserRole } from '../../../common/entities/enums/all.enums';

@Entity('audit_logs')
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

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

    @Column({ length: 255, nullable: true })
    user_email: string;

    @Column({ type: 'enum', enum: UserRole, nullable: true })
    user_role: UserRole;

    @Column({ length: 50 })
    action: string;

    @Column({ length: 50 })
    entity_type: string;

    @Column({ type: 'uuid', nullable: true })
    entity_id: string;

    @Column({ type: 'jsonb', nullable: true })
    changes: Record<string, any>;

    @Column({ type: 'inet', nullable: true })
    ip_address: string;

    @Column({ type: 'text', nullable: true })
    user_agent: string;

    @Column({ type: 'jsonb', nullable: true })
    device_info: Record<string, any>;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @Column({ type: 'jsonb', default: {} })
    metadata: Record<string, any>;
}
