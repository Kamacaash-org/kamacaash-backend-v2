import { registerAs } from '@nestjs/config';

const toBoolean = (value: string | undefined, fallback: boolean): boolean => {
    if (value === undefined) return fallback;
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
};

export default registerAs('queues', () => ({
    redis: {
        host: process.env.REDIS_HOST ?? '127.0.0.1',
        port: Number(process.env.REDIS_PORT ?? 6379),
        password: process.env.REDIS_PASSWORD || undefined,
        db: Number(process.env.REDIS_DB ?? 0),
    },
    orderHolds: {
        enabled: toBoolean(process.env.ORDER_HOLD_QUEUE_ENABLED, true),
        queueName: process.env.ORDER_HOLD_QUEUE_NAME ?? 'order-holds',
        attempts: Number(process.env.ORDER_HOLD_QUEUE_ATTEMPTS ?? 3),
        backoffMs: Number(process.env.ORDER_HOLD_QUEUE_BACKOFF_MS ?? 60 * 1000),
    },
    reviewReminders: {
        enabled: toBoolean(process.env.REVIEW_REMINDER_QUEUE_ENABLED, false),
        queueName: process.env.REVIEW_REMINDER_QUEUE_NAME ?? 'review-reminders',
        delayMs: Number(process.env.REVIEW_REMINDER_DELAY_MS ?? 20 * 60 * 1000),
        attempts: Number(process.env.REVIEW_REMINDER_ATTEMPTS ?? 3),
        backoffMs: Number(process.env.REVIEW_REMINDER_BACKOFF_MS ?? 60 * 1000),
    },
}));
