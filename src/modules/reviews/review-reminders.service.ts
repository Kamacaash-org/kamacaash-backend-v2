import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import IORedis from 'ioredis';
import { JobsOptions, Queue, Worker } from 'bullmq';
import { Repository } from 'typeorm';
import { NotificationType, OrderStatus, ReviewStatus } from '../../common/entities/enums/all.enums';
import { NotificationsService } from '../notifications/notifications.service';
import { Order } from '../orders/entities/order.entity';
import { Review } from './entities/review.entity';
import { UserDevice } from '../users/entities/user-device.entity';
import {
    REVIEW_REMINDER_DEFAULT_DELAY_MS,
    REVIEW_REMINDER_JOB_ID_PREFIX,
    REVIEW_REMINDER_JOB_NAME,
    REVIEW_REMINDER_QUEUE,
} from './review-reminder.constants';

type ReviewReminderJobData = {
    orderId: string;
};

@Injectable()
export class ReviewRemindersService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(ReviewRemindersService.name);
    private connection: IORedis | null = null;
    private queue: Queue<ReviewReminderJobData> | null = null;
    private worker: Worker<ReviewReminderJobData> | null = null;

    constructor(
        private readonly configService: ConfigService,
        @InjectRepository(Order)
        private readonly ordersRepository: Repository<Order>,
        @InjectRepository(Review)
        private readonly reviewsRepository: Repository<Review>,
        @InjectRepository(UserDevice)
        private readonly userDevicesRepository: Repository<UserDevice>,
        private readonly notificationsService: NotificationsService,
    ) { }

    onModuleInit(): void {
        if (!this.isEnabled()) {
            this.logger.log('Review reminder queue is disabled.');
            return;
        }

        const redisConfig = this.configService.get('queues.redis');
        const queueName = this.configService.get<string>('queues.reviewReminders.queueName') ?? REVIEW_REMINDER_QUEUE;
        this.connection = new IORedis({
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password,
            db: redisConfig.db,
            maxRetriesPerRequest: null,
        });
        this.queue = new Queue<ReviewReminderJobData>(queueName, {
            connection: this.connection,
        });
        this.worker = new Worker<ReviewReminderJobData>(
            queueName,
            async (job) => this.handleReviewReminder(job.data),
            {
                connection: this.connection,
            },
        );

        this.worker.on('completed', (job) => {
            this.logger.log(`Review reminder job completed: ${job.id}`);
        });
        this.worker.on('failed', (job, error) => {
            this.logger.error(
                `Review reminder job failed: ${job?.id ?? 'unknown'}`,
                error?.stack ?? String(error),
            );
        });
    }

    async onModuleDestroy(): Promise<void> {
        await this.worker?.close();
        await this.queue?.close();
        await this.connection?.quit();
    }

    async scheduleForCollectedOrder(orderId: string): Promise<void> {
        if (!this.isEnabled() || !this.queue) {
            this.logger.log(`Review reminder scheduling skipped for order ${orderId} because the queue is disabled.`);
            return;
        }

        const jobId = `${REVIEW_REMINDER_JOB_ID_PREFIX}${orderId}`;
        const existing = await this.queue.getJob(jobId);
        if (existing) {
            this.logger.log(`Review reminder scheduling skipped for order ${orderId}; job already exists.`);
            return;
        }

        const delayMs = this.configService.get<number>('queues.reviewReminders.delayMs') ?? REVIEW_REMINDER_DEFAULT_DELAY_MS;
        const attempts = this.configService.get<number>('queues.reviewReminders.attempts') ?? 3;
        const backoffMs = this.configService.get<number>('queues.reviewReminders.backoffMs') ?? 60_000;
        const options: JobsOptions = {
            jobId,
            delay: delayMs,
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

        await this.queue.add(REVIEW_REMINDER_JOB_NAME, { orderId }, options);
        this.logger.log(`Scheduled review reminder job for order ${orderId}.`);
    }

    private isEnabled(): boolean {
        return Boolean(this.configService.get<boolean>('queues.reviewReminders.enabled'));
    }

    private async handleReviewReminder(data: ReviewReminderJobData): Promise<void> {
        const order = await this.ordersRepository.findOne({
            where: { id: data.orderId },
        });

        if (!order) {
            this.logger.warn(`Review reminder skipped; order ${data.orderId} no longer exists.`);
            return;
        }

        const existingReview = await this.reviewsRepository.findOne({
            where: { order_id: order.id },
        });
        if (existingReview) {
            this.logger.log(`Review reminder skipped for order ${order.id}; review ${existingReview.id} already exists.`);
            return;
        }

        if (order.status !== OrderStatus.COLLECTED || order.has_user_reviewed) {
            this.logger.log(`Review reminder skipped for order ${order.id}; order is no longer eligible.`);
            return;
        }

        const title = 'How was your order?';
        const body = 'Your pickup is complete. Leave a quick review to help other customers choose with confidence.';
        const dataPayload = {
            type: 'review_reminder',
            orderId: order.id,
            businessId: order.business_id,
        };

        const activeDevices = await this.userDevicesRepository.find({
            where: { user_id: order.user_id, is_active: true },
            order: { last_used_at: 'DESC' },
        });
        const pushTokens = Array.from(new Set(activeDevices.map((device) => device.push_token).filter(Boolean)));

        await this.notificationsService.send(
            order.user_id,
            NotificationType.PUSH,
            title,
            body,
            dataPayload,
            'PUSH',
        );

        if (pushTokens.length) {
            await this.notificationsService.sendToDevices(pushTokens, {
                title,
                body,
                data: dataPayload,
            });
        }

        this.logger.log(`Review reminder sent for order ${order.id}.`);
    }
}
