import { Entity, Column, Index, OneToOne, JoinColumn, ManyToOne, BaseEntity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Review } from './review.entity';
import { StaffUser } from '../../staff/entities/staff-user.entity';
import { Business } from '../../businesses/entities/business.entity';

@Entity('review_replies')
export class ReviewReply {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', unique: true })
    review_id: string;

    @OneToOne(() => Review, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'review_id' })
    review: Review;

    @Column({ type: 'uuid', nullable: true })
    staff_user_id: string;

    @ManyToOne(() => StaffUser, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'staff_user_id' })
    staff_user: StaffUser;

    @Column({ type: 'uuid' })
    business_id: string;

    @ManyToOne(() => Business)
    @JoinColumn({ name: 'business_id' })
    business: Business;

    @Column({ type: 'text' })
    comment: string;

    @Column({ default: false })
    is_edited: boolean;

    @Column({ type: 'timestamptz', nullable: true })
    edited_at: Date;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at: Date;
}
