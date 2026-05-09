import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from 'typeorm';
import { RewardTransactionType } from '../../common/entities/enums/all.enums';
import { AppUser } from '../users/entities/app-user.entity';
import { Payment } from '../payments/entities/payment.entity';
import { RewardTransaction } from './entities/reward-transaction.entity';
import { UserRewardWallet } from './entities/user-reward-wallet.entity';

@Injectable()
export class RewardsService {
    private readonly logger = new Logger(RewardsService.name);

    constructor(private readonly configService: ConfigService) { }

    async awardApprovedPayment(manager: EntityManager, payment: Payment): Promise<void> {
        const loyaltyConfig = this.configService.get('loyalty');
        if (!loyaltyConfig?.enabled) {
            return;
        }

        const existing = await manager.findOne(RewardTransaction, {
            where: {
                payment_id: payment.id,
                type: RewardTransactionType.EARNED,
            },
            lock: { mode: 'pessimistic_write' },
        });

        if (existing) {
            return;
        }

        const amount = Number((payment.amount_minor / 100).toFixed(2));
        if (amount < loyaltyConfig.minPayment) {
            return;
        }

        const points = Math.min(
            Math.floor(amount * loyaltyConfig.pointsPerDollar),
            loyaltyConfig.maxPointsPerTx,
        );

        if (points <= 0) {
            return;
        }

        let wallet = await manager.findOne(UserRewardWallet, {
            where: { user_id: payment.user_id },
            lock: { mode: 'pessimistic_write' },
        });

        if (!wallet) {
            wallet = manager.create(UserRewardWallet, {
                user_id: payment.user_id,
                balance_points: 0,
                lifetime_earned_points: 0,
                lifetime_redeemed_points: 0,
            });
            wallet = await manager.save(UserRewardWallet, wallet);
        }

        wallet.balance_points += points;
        wallet.lifetime_earned_points += points;
        wallet.metadata = {
            ...wallet.metadata,
            last_payment_id: payment.id,
        };
        await manager.save(UserRewardWallet, wallet);

        const rewardTransaction = manager.create(RewardTransaction, {
            wallet_id: wallet.id,
            user_id: payment.user_id,
            payment_id: payment.id,
            type: RewardTransactionType.EARNED,
            points,
            balance_after: wallet.balance_points,
            description: `Rewarded for payment ${payment.payment_number}`,
            metadata: {
                order_id: payment.order_id,
                provider: payment.provider,
            },
        });
        await manager.save(RewardTransaction, rewardTransaction);

        await manager.increment(AppUser, { id: payment.user_id }, 'current_points', points);
        await manager.increment(AppUser, { id: payment.user_id }, 'lifetime_points_earned', points);

        this.logger.log(`Awarded ${points} loyalty points for payment ${payment.payment_number}`);
    }
}
