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
import { AppUser } from '../../users/entities/app-user.entity';
import { Business } from '../../businesses/entities/business.entity';
import { Order } from '../../orders/entities/order.entity';
import { Offer } from '../../offers/entities/offer.entity';
import { StaffUser } from '../../staff/entities/staff-user.entity';
import { ReviewStatus } from '../../../common/entities/enums/all.enums';

@Entity('reviews')
export class Review extends BaseSoftDeleteEntity {
    @Column({ type: 'uuid' })
    order_id: string;

    @OneToOne(() => Order, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'order_id' })
    order: Order;

    @Column({ type: 'uuid' })
    user_id: string;

    @ManyToOne(() => AppUser)
    @JoinColumn({ name: 'user_id' })
    user: AppUser;

    @Column({ type: 'uuid' })
    business_id: string;

    @ManyToOne(() => Business)
    @JoinColumn({ name: 'business_id' })
    business: Business;

    @Column({ type: 'uuid', nullable: true })
    offer_id: string;

    @ManyToOne(() => Offer, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'offer_id' })
    offer: Offer;

    @Column({ type: 'smallint' })
    rating: number;

    @Column({ length: 255, nullable: true })
    title: string;

    @Column({ type: 'text', nullable: true })
    comment: string;

    @Column({ type: 'text', array: true, default: [] })
    pros: string[];

    @Column({ type: 'text', array: true, default: [] })
    cons: string[];

    @Column({ type: 'text', array: true, default: [] })
    images: string[];

    @Column({ type: 'enum', enum: ReviewStatus, default: ReviewStatus.PENDING })
    status: ReviewStatus;

    @Column({ type: 'uuid', nullable: true })
    moderated_by: string;

    @ManyToOne(() => StaffUser)
    @JoinColumn({ name: 'moderated_by' })
    moderator: StaffUser;

    @Column({ type: 'timestamptz', nullable: true })
    moderated_at: Date;

    @Column({ type: 'text', nullable: true })
    moderation_notes: string;

    @Column({ type: 'int', default: 0 })
    flagged_count: number;

    @Column({ type: 'text', array: true, default: [] })
    flagged_reasons: string[];

    @Column({ type: 'int', default: 0 })
    helpful_count: number;

    @Column({ type: 'int', default: 0 })
    unhelpful_count: number;

    @Column({ default: true })
    is_visible: boolean;

    @Column({ default: false })
    is_featured: boolean;

    @Column({ type: 'timestamptz', nullable: true })
    featured_at: Date;
}
