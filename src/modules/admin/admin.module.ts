import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { Order } from '../orders/entities/order.entity';
import { Payment } from '../payments/entities/payment.entity';
import { AppUser } from '../users/entities/app-user.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Order, Payment, AppUser])],
    controllers: [AdminController],
    providers: [AdminService],
})
export class AdminModule { }
