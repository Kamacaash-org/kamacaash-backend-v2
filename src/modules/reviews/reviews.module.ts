import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { Review } from './entities/review.entity';
import { Order } from '../orders/entities/order.entity';
import { ReviewRemindersService } from './review-reminders.service';
import { UserDevice } from '../users/entities/user-device.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [TypeOrmModule.forFeature([Review, Order, UserDevice]), NotificationsModule],
    controllers: [ReviewsController],
    providers: [ReviewsService, ReviewRemindersService],
    exports: [ReviewsService, ReviewRemindersService],
})
export class ReviewsModule { }
