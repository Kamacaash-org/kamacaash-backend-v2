import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { Order } from '../orders/entities/order.entity';
import { PaymentStatus, OrderStatus } from '../../common/entities/enums/all.enums';

@Injectable()
export class PaymentsService {
    constructor(
        @InjectRepository(Payment)
        private paymentsRepository: Repository<Payment>,
        @InjectRepository(Order)
        private ordersRepository: Repository<Order>,
    ) { }

    async initializePayment(orderId: string, userId: string, provider: string) {
        const order = await this.ordersRepository.findOne({ where: { id: orderId, user_id: userId } });
        if (!order) throw new NotFoundException('Order not found');

        if (order.status !== OrderStatus.HOLD && order.status !== OrderStatus.PENDING_PAYMENT) {
            // Allow retrying payment if pending?
            // For now simple check
        }

        // Create payment record
        const payment = this.paymentsRepository.create({
            order_id: order.id,
            user_id: userId,
            business_id: order.business_id,
            amount_minor: order.total_amount_minor,
            currency_code: order.currency_code,
            provider: provider as any,
            status: PaymentStatus.PENDING,
            subtotal_minor: order.subtotal_minor,
            payment_number: `PAY-${Date.now()}`
        });

        await this.paymentsRepository.save(payment);

        // Mock returning payment intent/url
        return {
            payment_id: payment.id,
            payment_url: `https://mock-payment-gateway.com/pay/${payment.id}`,
            client_secret: 'mock_secret'
        };
    }

    async handleWebhook(payload: any) {
        // Implement webhook handling logic
        console.log('Webhook received', payload);
        return { received: true };
    }
}
