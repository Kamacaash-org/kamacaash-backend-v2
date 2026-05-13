import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { AppOrdersController } from './app/app-orders.controller';
import { AdminOrdersController } from './admin/admin-orders.controller';
import { Order } from './entities/order.entity';
import { OrderEvent } from './entities/order-event.entity';
import { Offer } from '../offers/entities/offer.entity';
import { Business } from '../businesses/entities/business.entity';
import { PaymentsModule } from '../payments/payments.module';
import { UsersModule } from '../users/users.module';
import { RewardsModule } from '../rewards/rewards.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { OrderHoldsQueueService } from './order-holds-queue.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Order, OrderEvent, Offer, Business]),
        PaymentsModule,
        UsersModule,
        RewardsModule,
        ReviewsModule,
    ],
    controllers: [AppOrdersController, AdminOrdersController],
    providers: [OrdersService, OrderHoldsQueueService],
    exports: [OrdersService],
})
export class OrdersModule { }
