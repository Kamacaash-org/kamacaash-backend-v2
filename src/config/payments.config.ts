import { registerAs } from '@nestjs/config';

const toBoolean = (value: string | undefined, fallback: boolean): boolean => {
    if (value === undefined) return fallback;
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
};

export default registerAs('payments', () => ({
    waafi: {
        enabled: toBoolean(process.env.WAAFI_ENABLED, false),
        baseUrl: process.env.WAAFI_BASE_URL ?? 'https://api.waafipay.net/asm',
        channelName: process.env.WAAFI_CHANNEL_NAME ?? 'WEB',
        serviceName: process.env.WAAFI_SERVICE_NAME ?? 'API_PURCHASE',
        merchantUid: process.env.WAAFI_MERCHANT_UID,
        apiUserId: process.env.WAAFI_API_USER_ID,
        apiKey: process.env.WAAFI_API_KEY,
        paymentMethod: process.env.WAAFI_PAYMENT_METHOD ?? 'mwallet_account',
        currency: process.env.WAAFI_CURRENCY ?? 'USD',
        requestTimeoutMs: Number(process.env.WAAFI_TIMEOUT_MS ?? 60000),
    },
}));
