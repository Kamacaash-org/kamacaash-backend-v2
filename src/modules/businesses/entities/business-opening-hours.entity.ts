import { Entity, Column, ManyToOne, JoinColumn, BaseEntity, PrimaryColumn } from 'typeorm';
import { Business } from './business.entity';

@Entity('business_opening_hours')
export class BusinessOpeningHours extends BaseEntity {
    @PrimaryColumn({ type: 'uuid' })
    business_id: string;

    @ManyToOne(() => Business, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'business_id' })
    business: Business;

    @PrimaryColumn({ type: 'smallint' })
    day_of_week: number; // 1=Mon, 7=Sun

    @Column({ type: 'time', nullable: true })
    opens_at: string;

    @Column({ type: 'time', nullable: true })
    closes_at: string;

    @Column({ select: false, insert: false, update: false, nullable: true })
    is_closed: boolean;


}
