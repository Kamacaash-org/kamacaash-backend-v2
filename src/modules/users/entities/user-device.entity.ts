import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { AppUser } from '../../users/entities/app-user.entity';

@Entity('user_devices')
@Index('idx_devices_user', ['user_id'])
@Index('idx_devices_push', ['push_token'])
export class UserDevice extends BaseEntity {
    @Column({ type: 'uuid' })
    user_id: string;

    @ManyToOne(() => AppUser, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: AppUser;

    @Column({ length: 255 })
    device_id: string;

    @Column({ length: 50 })
    device_type: string; // 'ios', 'android', 'web'

    @Column({ length: 255, nullable: true })
    device_name: string;

    @Column({ length: 100, nullable: true })
    device_model: string;

    @Column({ length: 50, nullable: true })
    os_version: string;

    @Column({ length: 20, nullable: true })
    app_version: string;

    @Column({ length: 255, nullable: true })
    push_token: string;

    @Column({ default: true })
    is_active: boolean;

    @Column({ type: 'timestamptz', default: () => 'NOW()' })
    last_used_at: Date;
}
