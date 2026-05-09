import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import IORedis from 'ioredis';
import { JobsOptions, Queue, Worker } from 'bullmq';
import { Repository } from 'typeorm';
import { OrderStatus, PaymentStatus } from '../../common/entities/enums/all.enums';
import { UserStatisticsService } from '../users/user-statistics.service';
import { Order } from './entities/order.entity';
import { OrderEvent } from './entities/order-event.entity';
import { Offer } from '../offers/entities/offer.entity';
import { ORDER_HOLD_JOB_ID_PREFIX, ORDER_HOLD_JOB_NAME, ORDER_HOLD_QUEUE } from './order-holds.constants';

type OrderHoldJobData = {
    orderId: string;
};

@Injectable()
export class OrderHoldsQueueService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(OrderHoldsQueueService.name);
    private connection: IORedis | null = null;
    private queue: Queue<OrderHoldJobData> | null = null;
    private worker: Worker<OrderHoldJobData> | null = null;

    constructor(
        private readonly configService: ConfigService,
        @InjectRepository(Order)
        private readonly ordersRepository: Repository<Order>,
        @InjectRepository(OrderEvent)
        private readonly orderEventsRepository: Repository<OrderEvent>,
        @InjectRepository(Offer)
        private readonly offersRepository: Repository<Offer>,
        private readonly userStatisticsService: UserStatisticsService,
    ) { }

    onModuleInit(): void {
        if (!this.isEnabled()) {
            this.logger.log('Order hold queue is disabled.');
            return;
        }

        const redisConfig = this.configService.get('queues.redis');
        const queueName = this.configService.get<string>('queues.orderHolds.queueName') ?? ORDER_HOLD_QUEUE;

        this.connection = new IORedis({
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password,
            db: redisConfig.db,
            maxRetriesPerRequest: null,
        });
        this.queue = new Queue<OrderHoldJobData>(queueName, {
            connection: this.connection,
        });
        this.worker = new Worker<OrderHoldJobData>(
            queueName,
            async (job) => this.handleHoldExpiry(job.data),
            {
                connection: this.connection,
            },
        );

        this.worker.on('completed', (job) => {
            this.logger.log(`Order hold job completed: ${job.id}`);
        });
        this.worker.on('failed', (job, error) => {
            this.logger.error(
                `Order hold job failed: ${job?.id ?? 'unknown'}`,
                error?.stack ?? String(error),
            );
        });
    }

    async onModuleDestroy(): Promise<void> {
        await this.worker?.close();
        await this.queue?.close();
        await this.connection?.quit();
    }

    async scheduleHoldExpiry(orderId: string, holdExpiresAt: Date | null | undefined): Promise<void> {
        if (!this.isEnabled() || !this.queue || !holdExpiresAt) {
            return;
        }

        const jobId = `${ORDER_HOLD_JOB_ID_PREFIX}${orderId}`;
        const existing = await this.queue.getJob(jobId);
        if (existing) {
            await existing.remove();
        }

        const attempts = this.configService.get<number>('queues.orderHolds.attempts') ?? 3;
        const backoffMs = this.configService.get<number>('queues.orderHolds.backoffMs') ?? 60_000;
        const options: JobsOptions = {
            jobId,
            delay: Math.max(holdExpiresAt.getTime() - Date.now(), 0),
            attempts,
            backoff: {
                type: 'exponential',
                delay: backoffMs,
            },
            removeOnComplete: {
                age: 24 * 60 * 60,
                count: 1000,
            },
            removeOnFail: {
                age: 7 * 24 * 60 * 60,
                count: 1000,
            },
        };

        await this.queue.add(ORDER_HOLD_JOB_NAME, { orderId }, options);
        this.logger.log(`Scheduled hold expiry job for order ${orderId}.`);
    }

    async cancelHoldExpiry(orderId: string): Promise<void> {
        if (!this.isEnabled() || !this.queue) {
            return;
        }

        const jobId = `${ORDER_HOLD_JOB_ID_PREFIX}${orderId}`;
        const existing = await this.queue.getJob(jobId);
        if (!existing) {
            return;
        }

        await existing.remove();
        this.logger.log(`Removed hold expiry job for order ${orderId}.`);
    }

    private isEnabled(): boolean {
        return Boolean(this.configService.get<boolean>('queues.orderHolds.enabled'));
    }

    private async handleHoldExpiry(data: OrderHoldJobData): Promise<void> {
        await this.ordersRepository.manager.transaction(async (manager) => {
            const order = await manager.findOne(Order, {
                where: { id: data.orderId },
                lock: { mode: 'pessimistic_write' },
            });

            if (!order) {
                this.logger.warn(`Order hold expiry skipped; order ${data.orderId} no longer exists.`);
                return;
            }

            if (
                ![OrderStatus.HOLD, OrderStatus.PENDING_PAYMENT].includes(order.status) ||
                order.payment_status === PaymentStatus.CONFIRMED
            ) {
                this.logger.log(`Order hold expiry skipped for order ${order.id}; order is no longer payable.`);
                return;
            }

            if (!order.hold_expires_at || order.hold_expires_at.getTime() > Date.now()) {
                this.logger.log(`Order hold expiry skipped for order ${order.id}; hold is still active.`);
                return;
            }

            const offer = await manager.findOne(Offer, {
                where: { id: order.offer_id },
                lock: { mode: 'pessimistic_write' },
            });
            if (!offer) {
                this.logger.warn(`Order hold expiry skipped; offer ${order.offer_id} no longer exists.`);
                return;
            }

            const previousStatus = order.status;
            const previousPaymentStatus = order.payment_status;

            offer.quantity_remaining += order.quantity;
            offer.quantity_reserved = Math.max(offer.quantity_reserved - order.quantity, 0);
            order.status = OrderStatus.EXPIRED;
            order.expired_at = new Date();
            order.hold_expires_at = null as any;

            await manager.save(offer);
            const savedOrder = await manager.save(Order, order);
            const event = this.orderEventsRepository.create({
                order_id: savedOrder.id,
                from_status: previousStatus,
                to_status: savedOrder.status,
                from_payment_status: previousPaymentStatus,
                to_payment_status: savedOrder.payment_status,
                actor_type: 'SYSTEM',
                note: 'Reservation expired before payment was confirmed. Quantity restored to the offer.',
            });
            await manager.save(OrderEvent, event);
            await this.userStatisticsService.rebuildForUser(manager, savedOrder.user_id);

            this.logger.log(`Expired unpaid reservation for order ${savedOrder.id}.`);
        });
    }
}
