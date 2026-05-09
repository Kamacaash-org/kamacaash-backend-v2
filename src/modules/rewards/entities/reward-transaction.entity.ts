import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { RewardTransactionType } from '../../../common/entities/enums/all.enums';
import { UserRewardWallet } from './user-reward-wallet.entity';
import { AppUser } from '../../users/entities/app-user.entity';
import { Payment } from '../../payments/entities/payment.entity';

@Entity('reward_transactions')
@Index(['wallet_id', 'type'])
@Index(['payment_id', 'type'], { unique: true })
export class RewardTransaction extends BaseEntity {
    @Column({ type: 'uuid' })
    wallet_id!: string;

    @ManyToOne(() => UserRewardWallet, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'wallet_id' })
    wallet!: UserRewardWallet;

    @Column({ type: 'uuid' })
    user_id!: string;

    @ManyToOne(() => AppUser, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: AppUser;

    @Column({ type: 'uuid', nullable: true })
    payment_id!: string | null;

    @ManyToOne(() => Payment, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'payment_id' })
    payment!: Payment | null;

    @Column({ type: 'enum', enum: RewardTransactionType })
    type!: RewardTransactionType;

    @Column({ type: 'int' })
    points!: number;

    @Column({ type: 'int' })
    balance_after!: number;

    @Column({ type: 'text', nullable: true })
    description!: string | null;
}
