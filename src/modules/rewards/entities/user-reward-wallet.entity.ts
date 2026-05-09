import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { AppUser } from '../../users/entities/app-user.entity';

@Entity('user_reward_wallets')
@Index(['user_id'], { unique: true })
export class UserRewardWallet extends BaseEntity {
    @Column({ type: 'uuid' })
    user_id!: string;

    @OneToOne(() => AppUser, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: AppUser;

    @Column({ type: 'int', default: 0 })
    balance_points!: number;

    @Column({ type: 'int', default: 0 })
    lifetime_earned_points!: number;

    @Column({ type: 'int', default: 0 })
    lifetime_redeemed_points!: number;
}
