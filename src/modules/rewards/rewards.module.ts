import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RewardsService } from './rewards.service';
import { UserRewardWallet } from './entities/user-reward-wallet.entity';
import { RewardTransaction } from './entities/reward-transaction.entity';
import { AppUser } from '../users/entities/app-user.entity';

@Module({
    imports: [TypeOrmModule.forFeature([UserRewardWallet, RewardTransaction, AppUser])],
    providers: [RewardsService],
    exports: [RewardsService],
})
export class RewardsModule { }
