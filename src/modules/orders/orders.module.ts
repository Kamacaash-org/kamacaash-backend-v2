import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { AppOrdersController } from './app/app-orders.controller';
import { AdminOrdersController } from './admin/admin-orders.controller';
import { Order } from './entities/order.entity';
import { OrderEvent } from './entities/order-event.entity';
import { Offer } from '../offers/entities/offer.entity';
import { Business } from '../businesses/entities/business.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Order, OrderEvent, Offer, Business])],
    controllers: [AppOrdersController, AdminOrdersController],
    providers: [OrdersService],
    exports: [OrdersService],
})
export class OrdersModule { }
