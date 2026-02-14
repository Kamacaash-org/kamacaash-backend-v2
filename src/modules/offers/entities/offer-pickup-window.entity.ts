import { Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne, JoinColumn, BaseEntity } from 'typeorm';
import { Offer } from './offer.entity';

@Entity('offer_pickup_windows')
@Index('idx_pickup_windows_offer', ['offer_id'])
@Index('idx_pickup_windows_time', ['starts_at', 'ends_at'])
export class OfferPickupWindow extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    offer_id: string;

    @ManyToOne(() => Offer, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'offer_id' })
    offer: Offer;

    @Column({ type: 'timestamptz' })
    starts_at: Date;

    @Column({ type: 'timestamptz' })
    ends_at: Date;

    @Column({ type: 'int', nullable: true })
    max_pickups_per_window: number;

    @Column({ type: 'timestamptz', default: () => 'NOW()' })
    created_at: Date;
}
