import { registerAs } from '@nestjs/config';

const toBoolean = (value: string | undefined, fallback: boolean): boolean => {
    if (value === undefined) return fallback;
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
};

const toNumber = (value: string | undefined, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

export default registerAs('loyalty', () => ({
    enabled: toBoolean(process.env.LOYALTY_ENABLED, true),
    pointsPerDollar: toNumber(process.env.LOYALTY_POINTS_PER_DOLLAR, 10),
    minPayment: toNumber(process.env.LOYALTY_MIN_PAYMENT, 1),
    maxPointsPerTx: toNumber(process.env.LOYALTY_MAX_POINTS_PER_TX, 1000),
}));
