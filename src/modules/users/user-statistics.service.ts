import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { AppUser } from './entities/app-user.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderStatus, PaymentStatus } from '../../common/entities/enums/all.enums';

@Injectable()
export class UserStatisticsService {
    async rebuildForUser(manager: EntityManager, userId: string): Promise<void> {
        const stats = await manager
            .createQueryBuilder(Order, 'ord')
            .select('COUNT(ord.id)', 'total_orders')
            .addSelect(
                `COALESCE(SUM(CASE WHEN ord.status IN (:...completedStatuses) THEN 1 ELSE 0 END), 0)`,
                'total_completed_orders',
            )
            .addSelect(
                `COALESCE(SUM(CASE WHEN ord.status IN (:...cancelledStatuses) THEN 1 ELSE 0 END), 0)`,
                'total_cancelled_orders',
            )
            .addSelect('COALESCE(SUM(ord.discount_minor), 0)', 'total_saved_amount_minor')
            .addSelect(
                `COALESCE(SUM(CASE
                    WHEN ord.payment_status = :confirmedPaymentStatus
                        OR ord.status IN (:...paidStatuses)
                    THEN ord.total_amount_minor
                    ELSE 0
                END), 0)`,
                'total_spent_amount_minor',
            )
            .where('ord.user_id = :userId', { userId })
            .setParameters({
                completedStatuses: [OrderStatus.COLLECTED, OrderStatus.CLOSED],
                cancelledStatuses: [
                    OrderStatus.CANCELLED,
                    OrderStatus.CANCELLED_BY_USER,
                    OrderStatus.CANCELLED_BY_ADMIN,
                    OrderStatus.EXPIRED,
                    OrderStatus.NO_SHOW,
                ],
                paidStatuses: [
                    OrderStatus.PAID,
                    OrderStatus.READY_FOR_PICKUP,
                    OrderStatus.COLLECTED,
                    OrderStatus.CLOSED,
                ],
                confirmedPaymentStatus: PaymentStatus.CONFIRMED,
            })
            .getRawOne<{
                total_orders: string;
                total_completed_orders: string;
                total_cancelled_orders: string;
                total_saved_amount_minor: string;
                total_spent_amount_minor: string;
            }>();

        await manager.update(AppUser, { id: userId }, {
            total_orders: Number(stats?.total_orders ?? 0),
            total_completed_orders: Number(stats?.total_completed_orders ?? 0),
            total_cancelled_orders: Number(stats?.total_cancelled_orders ?? 0),
            total_saved_amount_minor: Number(stats?.total_saved_amount_minor ?? 0),
            total_spent_amount_minor: Number(stats?.total_spent_amount_minor ?? 0),
        });
    }
}
