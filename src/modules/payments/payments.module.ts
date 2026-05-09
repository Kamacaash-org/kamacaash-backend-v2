import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Payment } from './entities/payment.entity';
import { Order } from '../orders/entities/order.entity';
import { PaymentLog } from './entities/payment-log.entity';
import { PaymentEvent } from './entities/payment-event.entity';
import { WaafiPaymentClientService } from './waafi-payment-client.service';

@Module({
    imports: [TypeOrmModule.forFeature([Payment, PaymentLog, PaymentEvent, Order])],
    controllers: [PaymentsController],
    providers: [PaymentsService, WaafiPaymentClientService],
    exports: [PaymentsService],
})
export class PaymentsModule { }
