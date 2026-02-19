import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseSoftDeleteEntity } from '../../../common/entities/base.entity';
import { Country } from '../../countries/entities/country.entity';
import { sexOptions, UserRole } from '../../../common/entities/enums/all.enums';
import { Business } from 'src/modules/businesses/entities/business.entity';

@Entity('staff_users')
export class StaffUser extends BaseSoftDeleteEntity {
    @Column({ length: 255, unique: true })
    email: string;

    @Column({ length: 100, unique: true, nullable: true })
    username: string;

    @Column({ type: 'char', length: 2, nullable: true })
    country_code: string;

    @ManyToOne(() => Country)
    @JoinColumn({ name: 'country_code', referencedColumnName: 'iso_code_3166' })
    country: Country;

    @Column({ type: 'char', length: 10, nullable: true })
    phone_code: string;

    @ManyToOne(() => Country)
    @JoinColumn({ name: 'phone_code', referencedColumnName: 'phone_code' })
    phone_country: Country;


    @Column({ type: 'uuid', nullable: true })
    business_id: string;

    @ManyToOne(() => Business, { nullable: true })
    @JoinColumn({ name: 'business_id' })
    business?: Business;


    @Column({ length: 50, unique: true })
    phone_e164: string;

    @Column({ length: 100 })
    first_name: string;

    @Column({ length: 100 })
    last_name: string;

    @Column({ length: 200, insert: false, update: false, nullable: true })
    full_name: string;

    @Column({ type: 'text', nullable: true })
    profile_image_url: string;

    @Column({ length: 255 })
    password_hash: string;

    @Column({ type: 'enum', enum: UserRole })
    role: UserRole;

    @Column({
        type: 'enum', enum: sexOptions, nullable: true,
    })
    sex: sexOptions;

    @Column({ type: 'text', array: true, default: [] })
    permissions: string[];

    @Column({ default: true })
    is_active: boolean;

    @Column({ default: false })
    is_admin_approved: boolean;

    @Column({ type: 'uuid', nullable: true })
    created_by: string;

    @ManyToOne(() => StaffUser)
    @JoinColumn({ name: 'created_by' })
    creator: StaffUser;


    @Column({ type: 'uuid', nullable: true })
    updated_by: string;

    @ManyToOne(() => StaffUser)
    @JoinColumn({ name: 'updated_by' })
    updater: StaffUser;

    @Column({ type: 'uuid', nullable: true })
    approved_by: string;


    @ManyToOne(() => StaffUser)
    @JoinColumn({ name: 'approved_by' })
    approver: StaffUser;

    @Column({ type: 'timestamptz', nullable: true })
    approved_at: Date;

    @Column({ default: true })
    must_change_password: boolean;

    @Column({ type: 'timestamptz', nullable: true })
    last_login_at: Date;

    @Column({ type: 'inet', nullable: true })
    last_login_ip: string;

    @Column({ type: 'int', default: 0 })
    login_attempts: number;

    @Column({ type: 'timestamptz', nullable: true })
    locked_until: Date;

    @Column({ type: 'timestamptz', nullable: true })
    password_changed_at: Date;

    @Column({ length: 255, nullable: true })
    password_reset_token: string;

    @Column({ type: 'timestamptz', nullable: true })
    password_reset_expires_at: Date;

    @Column({ default: false })
    two_factor_enabled: boolean;

    @Column({ length: 255, nullable: true })
    two_factor_secret: string;

    @Column({ type: 'text', nullable: true })
    notes: string;
}
