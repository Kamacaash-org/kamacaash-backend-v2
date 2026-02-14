import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { Payment } from '../payments/entities/payment.entity';
import { AppUser } from '../users/entities/app-user.entity';

@Injectable()
export class AdminService {
    constructor(
        @InjectRepository(Order)
        private ordersRepository: Repository<Order>,
        @InjectRepository(Payment)
        private paymentsRepository: Repository<Payment>,
        @InjectRepository(AppUser)
        private usersRepository: Repository<AppUser>,
    ) { }

    async getDashboardStats() {
        const totalUsers = await this.usersRepository.count();
        const totalOrders = await this.ordersRepository.count();

        const { totalRevenue } = await this.paymentsRepository
            .createQueryBuilder('payment')
            .select('SUM(payment.amount_minor)', 'totalRevenue')
            .where('payment.status = :status', { status: 'CONFIRMED' }) // Use string literal to avoid enum issues for now or ensure enum is strict
            .getRawOne();

        return {
            totalUsers,
            totalOrders,
            totalRevenue: parseInt(totalRevenue || '0', 10),
        };
    }
}
