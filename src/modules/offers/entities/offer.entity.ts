import {
    Entity,
    Column,
    Index,
    ManyToOne,
    JoinColumn,
    OneToMany,
} from 'typeorm';
import { BaseSoftDeleteEntity } from '../../../common/entities/base.entity';
import { Business } from '../../businesses/entities/business.entity';
import { BusinessCategory } from '../../categories/entities/business-category.entity';
import { StaffUser } from '../../staff/entities/staff-user.entity';
import { OfferStatus } from '../../../common/entities/enums/all.enums';
import { OfferPickupWindow } from './offer-pickup-window.entity';

@Entity('offers')
export class Offer extends BaseSoftDeleteEntity {
    @Column({ type: 'uuid' })
    business_id!: string;

    @ManyToOne(() => Business, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'business_id' })
    business!: Business;

    @OneToMany(() => OfferPickupWindow, (pickupWindow) => pickupWindow.offer)
    pickup_windows!: OfferPickupWindow[];

    @Column({ type: 'uuid', nullable: true })
    category_id?: string;

    @ManyToOne(() => BusinessCategory, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'category_id' })
    category?: BusinessCategory;

    @Column({ type: 'uuid', nullable: true })
    created_by_staff_id?: string;

    @ManyToOne(() => StaffUser, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'created_by_staff_id' })
    created_by_staff?: StaffUser;

    @Column({ type: 'uuid', nullable: true })
    updated_by?: string;

    @ManyToOne(() => StaffUser, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'updated_by' })
    updater?: StaffUser;

    @Column({ length: 255 })
    title!: string;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ length: 500, nullable: true })
    short_description?: string;

    @Column({ type: 'text', array: true, default: [] })
    tags!: string[];

    @Column({ type: 'text', array: true, default: [] })
    dietary_info!: string[];

    @Column({ type: 'text', array: true, default: [] })
    allergen_info!: string[];

    @Column({ type: 'text', nullable: true })
    main_image_url?: string;

    @Column({ type: 'text', array: true, default: [] })
    gallery_images!: string[];

    @Column({ type: 'int' })
    original_price_minor!: number;

    @Column({ type: 'int' })
    offer_price_minor!: number;

    @Column({
        type: 'decimal',
        precision: 5,
        scale: 2,
        generatedType: 'STORED',
        asExpression: `CASE WHEN original_price_minor > 0 THEN (1 - offer_price_minor::DECIMAL / original_price_minor::DECIMAL) * 100 ELSE 0 END`,
    })
    discount_percentage!: number;

    @Column({ type: 'int' })
    quantity_total!: number;

    @Column({ type: 'int' })
    quantity_remaining!: number;

    @Column({ type: 'int', default: 0 })
    quantity_reserved!: number;

    @Column({ type: 'int', default: 10 })
    max_per_user!: number;

    @Column({ type: 'enum', enum: OfferStatus, default: OfferStatus.DRAFT })
    status!: OfferStatus;

    @Column({ default: false })
    is_archived!: boolean;

    @Column({ type: 'uuid', nullable: true })
    archived_by?: string;

    @ManyToOne(() => StaffUser, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'archived_by' })
    archiver?: StaffUser;

    @Column({ type: 'timestamptz', nullable: true })
    archived_at?: Date;

    @Column({ default: false })
    is_featured!: boolean;

    @Column({ default: false })
    is_order_time_limited!: boolean;

    @Column({ type: 'timestamptz', nullable: true })
    order_cutoff_at?: Date;

    @Column({ type: 'timestamptz' })
    pickup_start!: Date;

    @Column({ type: 'timestamptz' })
    pickup_end!: Date;

    @Column({ type: 'text', nullable: true })
    pickup_instructions?: string;

    @Column({ type: 'int', default: 0 })
    advance_notice_hours!: number;

    @Column({
        type: 'timestamptz',
        generatedType: 'STORED',
        asExpression: 'pickup_end',
    })
    expires_at!: Date;

    @Column({ type: 'timestamptz', nullable: true })
    published_at?: Date;

    @Column({ type: 'timestamptz', nullable: true })
    paused_at?: Date;

    @Column({ type: 'text', array: true, default: [] })
    contents!: string[];

    @Column({ type: 'text', nullable: true })
    notes?: string;
}
