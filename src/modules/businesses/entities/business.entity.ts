import {
    Entity,
    Column,
    Index,
    ManyToOne,
    JoinColumn,
    OneToMany,
    OneToOne,
} from 'typeorm';
import { BaseSoftDeleteEntity } from '../../../common/entities/base.entity';
import { Country } from '../../countries/entities/country.entity';
import { AppUser } from '../../users/entities/app-user.entity';
import { StaffUser } from '../../staff/entities/staff-user.entity';
import { BusinessCategory } from '../../categories/entities/business-category.entity';
import {
    BusinessStatus,
    BusinessVerificationStatus,
} from '../../../common/entities/enums/all.enums';
import { City } from 'src/modules/cities/entities/city.entity';

@Entity('businesses')
export class Business extends BaseSoftDeleteEntity {
    @Column({ length: 255 })
    legal_name!: string;

    @Column({ length: 255 })
    display_name!: string;

    @Column({ type: 'uuid' })
    category_id!: string;

    @ManyToOne(() => BusinessCategory)
    @JoinColumn({ name: 'category_id' })
    category!: BusinessCategory;

    @Column({ type: 'uuid', nullable: true })
    primary_staff_id!: string;

    @ManyToOne(() => StaffUser, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'primary_staff_id' })
    primary_staff!: StaffUser;

    @Column({ type: 'uuid', nullable: true })
    city_id?: string;

    @ManyToOne(() => City)
    @JoinColumn({ name: 'city_id', referencedColumnName: 'id' })
    city!: City;

    @Column({ type: 'text', nullable: true })
    address_line?: string;

    @Column({
        type: 'geography',
        spatialFeatureType: 'Point',
        srid: 4326,
    })
    location?: any;

    @Column({ length: 50 })
    phone!: string;

    @Column({ length: 50, nullable: true })
    secondary_phone?: string;

    @Column({ length: 255, nullable: true })
    email?: string;

    @Column({ length: 255, nullable: true })
    website_url?: string;

    @Column({ type: 'jsonb', default: {} })
    social_links?: Record<string, string>;

    @Column({ type: 'text', nullable: true })
    logo_url!: string;

    @Column({ type: 'text', nullable: true })
    banner_url!: string;

    @Column({ type: 'text', array: true, default: [] })
    gallery_images!: string[];

    @Column({ type: 'text', nullable: true })
    description!: string;

    @Column({ length: 500, nullable: true })
    short_description!: string;

    @Column({ length: 100, nullable: true })
    SQN?: string;

    @Column({ type: 'text', nullable: true })
    license_document_url!: string;

    @Column({ type: 'text', nullable: true })
    contract_document_url!: string;

    @Column({
        type: 'enum',
        enum: BusinessVerificationStatus,
        default: BusinessVerificationStatus.PENDING,
    })
    verification_status!: BusinessVerificationStatus;

    @Column({ type: 'timestamptz', nullable: true })
    verification_submitted_at?: Date;
    @Column({
        type: 'timestamp',
        nullable: true,
    })
    @Column({ type: 'timestamptz', nullable: true })
    verification_reviewed_at?: Date;

    @Column({
        type: 'text',
        nullable: true,
    })
    @Column({ type: 'text', nullable: true })
    verification_rejection_reason?: string;

    @Column({ type: "uuid", nullable: true })
    rejected_by_admin_id?: string;

    @ManyToOne(() => StaffUser)
    @JoinColumn({ name: 'rejected_by_admin_id' })
    rejecter?: StaffUser;

    @Column({
        type: 'uuid',
        nullable: true,
    })
    verified_by_admin_id?: string;

    @ManyToOne(() => StaffUser)
    @JoinColumn({ name: 'verified_by_admin_id' })
    verified_by_admin!: StaffUser;

    @Column({
        type: 'enum',
        enum: BusinessStatus,
        default: BusinessStatus.ACTIVE,
    })
    status!: BusinessStatus;

    @Column({ default: false })
    is_archived!: boolean;

    @Column({ type: 'uuid', nullable: true })
    archived_by!: string;

    @ManyToOne(() => StaffUser)
    @JoinColumn({ name: 'archived_by' })
    archiver!: StaffUser;

    @Column({ type: 'timestamptz', nullable: true })
    archived_at!: Date;

    @Column({ type: 'uuid', nullable: true })
    created_by!: string;

    @ManyToOne(() => StaffUser)
    @JoinColumn({ name: 'created_by' })
    creator!: StaffUser;

    @Column({ type: 'uuid', nullable: true })
    updated_by!: string;

    @ManyToOne(() => StaffUser)
    @JoinColumn({ name: 'updated_by' })
    updater!: StaffUser;

    @Column({ default: false })
    is_featured!: boolean;

    @Column({ type: 'timestamptz', nullable: true })
    featured_until!: Date;

    @Column({ type: 'jsonb', default: [] })
    merchant_accounts!: {
        merchantHolderName: string;
        merchantNumber: string;
        merchantProvider: string;
        isActive: boolean;
        isVerified: boolean;
    }[];

    @Column({ type: 'text', nullable: true })
    notes!: string;
}
