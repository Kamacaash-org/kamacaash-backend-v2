import {
    Entity,
    Column,
    Index,
    ManyToOne,
    JoinColumn,
    OneToMany,
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

@Entity('businesses')
export class Business extends BaseSoftDeleteEntity {
    @Column({ length: 255 })
    owner_name: string;

    @Column({ length: 255 })
    legal_name: string;

    @Column({ length: 255 })
    display_name: string;

    @Column({ length: 255 })
    slug: string;

    @Column({ type: 'uuid' })
    category_id: string;

    @ManyToOne(() => BusinessCategory)
    @JoinColumn({ name: 'category_id' })
    category: BusinessCategory;

    @Column({ type: 'uuid', array: true, default: [] })
    subcategories: string[];

    @Column({ type: 'text', array: true, default: [] })
    tags: string[];


    @Column({ type: 'uuid', nullable: true })
    primary_staff_id: string;

    @ManyToOne(() => StaffUser, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'primary_staff_id' })
    primary_staff: StaffUser;

    @Column({ type: 'char', length: 2 })
    country_code: string;

    @ManyToOne(() => Country)
    @JoinColumn({ name: 'country_code', referencedColumnName: 'iso_code_3166' })
    country: Country;

    @Column({ length: 100 })
    city: string;

    @Column({ length: 100, nullable: true })
    region: string;

    @Column({ length: 100, nullable: true })
    district: string;

    @Column({ type: 'text', nullable: true })
    address_line1: string;

    @Column({ type: 'text', nullable: true })
    address_line2: string;

    @Column({ length: 20, nullable: true })
    postal_code: string;

    @Column({
        type: 'geography',
        spatialFeatureType: 'Point',
        srid: 4326,
    })
    location: any;

    @Column({ length: 50 })
    phone_e164: string;

    @Column({ length: 50, nullable: true })
    secondary_phone: string;

    @Column({ length: 255, nullable: true })
    email: string;

    @Column({ length: 255, nullable: true })
    website_url: string;

    @Column({ type: 'jsonb', default: {} })
    social_links: Record<string, string>;

    @Column({ type: 'text', nullable: true })
    logo_url: string;

    @Column({ type: 'text', nullable: true })
    banner_url: string;

    @Column({ type: 'text', array: true, default: [] })
    gallery_images: string[];

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ length: 500, nullable: true })
    short_description: string;

    @Column({ length: 100, nullable: true })
    registration_number: string;

    @Column({ length: 100, nullable: true })
    tax_id: string;

    @Column({ type: 'text', nullable: true })
    license_document_url: string;

    @Column({ type: 'char', length: 3, default: 'USD' })
    currency_code: string;

    @Column({ length: 50, default: 'Africa/Mogadishu' })
    timezone: string;

    @Column({ length: 10, default: 'en' })
    default_language: string;

    @Column({
        type: 'enum',
        enum: BusinessVerificationStatus,
        default: BusinessVerificationStatus.UNVERIFIED,
    })
    verification_status: BusinessVerificationStatus;

    @Column({
        type: 'enum',
        enum: BusinessStatus,
        default: BusinessStatus.ACTIVE,
    })
    status: BusinessStatus;

    @Column({ default: true })
    is_active: boolean;

    @Column({ default: false })
    is_archived: boolean;

    @Column({ default: false })
    is_featured: boolean;

    @Column({ type: 'timestamptz', nullable: true })
    featured_until: Date;

    @Column({ type: 'text', nullable: true })
    rejection_reason: string;

    // Statistics
    @Column({ type: 'int', default: 0 })
    total_offers: number;

    @Column({ type: 'int', default: 0 })
    active_offers: number;

    @Column({ type: 'int', default: 0 })
    total_orders: number;

    @Column({ type: 'int', default: 0 })
    completed_orders: number;

    @Column({ type: 'bigint', default: 0 })
    total_revenue_minor: number;

    @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
    average_rating: number;

    @Column({ type: 'int', default: 0 })
    total_reviews: number;

    @Column({ type: 'int', default: 0 })
    total_favorites: number;

    @Column({ type: 'jsonb', default: {} })
    business_hours: Record<string, any[]>;

    @Column({ type: 'jsonb', default: [] })
    holiday_hours: any[];

    @Column({ type: 'jsonb', default: {} })
    settings: Record<string, any>;

    @Column({ type: 'text', nullable: true })
    notes: string;
}
