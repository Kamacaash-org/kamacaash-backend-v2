import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseSoftDeleteEntity } from '../../../common/entities/base.entity';
import { Country } from '../../countries/entities/country.entity';
import { UserStatus } from '../../../common/entities/enums/all.enums';

@Entity('app_users')
@Index('idx_app_users_email', ['email'])
@Index('idx_app_users_phone', ['phone_e164'])
@Index('idx_app_users_status', ['status'])
@Index('idx_app_users_otp', ['otp_expires_at'])
export class AppUser extends BaseSoftDeleteEntity {
    @Column({ length: 255, unique: true })
    email: string;

    @Column({ length: 50, unique: true })
    phone_e164: string;

    @Column({ type: 'char', length: 2, nullable: true })
    phone_country_code: string;

    @ManyToOne(() => Country)
    @JoinColumn({ name: 'phone_country_code', referencedColumnName: 'iso_code_3166' })
    country: Country;

    @Column({ length: 100, nullable: true })
    first_name: string;

    @Column({ length: 100, nullable: true })
    last_name: string;

    // full_name is generated in DB, but we can treat it as a column for reading
    @Column({ length: 200, insert: false, update: false, nullable: true })
    full_name: string;

    @Column({ type: 'text', nullable: true })
    profile_image_url: string;

    @Column({ default: false })
    phone_verified: boolean;

    @Column({ default: false })
    email_verified: boolean;

    @Column({ default: false })
    identity_verified: boolean;

    @Column({ type: 'timestamptz', nullable: true })
    verified_at: Date;

    @Column({ length: 10, default: 'en' })
    preferred_language: string;

    @Column({ type: 'char', length: 3, default: 'USD' })
    preferred_currency: string;

    @Column({ type: 'jsonb', default: { email: true, sms: true, push: true } })
    notification_preferences: Record<string, boolean>;

    // PostGIS geography point
    @Column({
        type: 'geography',
        spatialFeatureType: 'Point',
        srid: 4326,
        nullable: true,
    })
    default_location: any;

    @Column({ type: 'text', nullable: true })
    default_address: string;

    @Column({ length: 100, nullable: true })
    default_city: string;

    @Column({ type: 'enum', enum: UserStatus, default: UserStatus.PENDING })
    status: UserStatus;

    @Column({ default: false })
    is_banned: boolean;

    @Column({ type: 'timestamptz', nullable: true })
    banned_until: Date;

    @Column({ type: 'text', nullable: true })
    ban_reason: string;

    @Column({ length: 6, nullable: true })
    otp_code: string;

    @Column({ type: 'timestamptz', nullable: true })
    otp_expires_at: Date;

    @Column({ type: 'int', default: 0 })
    otp_failed_attempts: number;

    @Column({ type: 'timestamptz', nullable: true })
    otp_verified_at: Date;

    @Column({ type: 'timestamptz', nullable: true })
    locked_until: Date;

    @Column({ type: 'timestamptz', nullable: true })
    last_login_at: Date;

    @Column({ type: 'inet', nullable: true })
    last_login_ip: string;

    @Column({ type: 'jsonb', nullable: true })
    last_login_device: Record<string, any>;

    @Column({ type: 'text', nullable: true })
    notes: string;
}
