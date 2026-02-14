import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayoutsService } from './payouts.service';
import { PayoutsController } from './payouts.controller';
import { Payout } from './entities/payout.entity';
import { PayoutItem } from './entities/payout-item.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Payout, PayoutItem])],
    controllers: [PayoutsController],
    providers: [PayoutsService],
    exports: [PayoutsService],
})
export class PayoutsModule { }
