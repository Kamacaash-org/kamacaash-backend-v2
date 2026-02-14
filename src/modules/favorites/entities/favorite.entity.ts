import { Entity, Column, Index, ManyToOne, JoinColumn, BaseEntity, PrimaryGeneratedColumn, CreateDateColumn, Unique } from 'typeorm';
import { AppUser } from '../../users/entities/app-user.entity';
import { Business } from '../../businesses/entities/business.entity';
import { FavoriteSource } from '../../../common/entities/enums/all.enums';

@Entity('favorites')
@Index('idx_favorites_user', ['user_id'])
@Index('idx_favorites_business', ['business_id'])
@Unique('uq_favorites_user_business', ['user_id', 'business_id'])
export class Favorite {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    user_id: string;

    @ManyToOne(() => AppUser, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: AppUser;

    @Column({ type: 'uuid' })
    business_id: string;

    @ManyToOne(() => Business, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'business_id' })
    business: Business;

    @Column({ type: 'enum', enum: FavoriteSource, default: FavoriteSource.MANUAL })
    source: FavoriteSource;

    @Column({ type: 'text', nullable: true })
    note: string;

    @Column({ default: true })
    is_visible: boolean;

    @Column({ default: false })
    is_removed: boolean;

    @Column({ type: 'timestamptz', nullable: true })
    removed_at: Date;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;
}
