import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { Order } from '../orders/entities/order.entity';
import { Payment } from '../payments/entities/payment.entity';
import { AppUser } from '../users/entities/app-user.entity';
import { StaffUser } from '../staff/entities/staff-user.entity';
import { Business } from '../businesses/entities/business.entity';
import { Offer } from '../offers/entities/offer.entity';
import { Review } from '../reviews/entities/review.entity';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
    imports: [TypeOrmModule.forFeature([Order, Payment, AppUser, StaffUser, Business, Offer, Review])],
    controllers: [AdminController],
    providers: [AdminService, RolesGuard],
})
export class AdminModule { }
