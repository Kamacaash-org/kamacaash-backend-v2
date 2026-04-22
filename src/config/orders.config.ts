import { registerAs } from '@nestjs/config';
import { OrderStatus } from '../common/entities/enums/all.enums';

const toPositiveNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const ORDER_HOLD_MINUTES = toPositiveNumber(process.env.ORDER_HOLD_MINUTES, 5);
export const ORDER_EXPIRY_JOB_INTERVAL_SECONDS = toPositiveNumber(
  process.env.ORDER_EXPIRY_JOB_INTERVAL_SECONDS,
  30,
);
export const ORDER_NO_SHOW_GRACE_MINUTES = toPositiveNumber(
  process.env.ORDER_NO_SHOW_GRACE_MINUTES,
  30,
);
export const ADMIN_PENDING_ORDER_STATUSES = [
  OrderStatus.PAID,
  OrderStatus.READY_FOR_PICKUP,
];

export default registerAs('orders', () => ({
  holdMinutes: ORDER_HOLD_MINUTES,
  expiryJobIntervalSeconds: ORDER_EXPIRY_JOB_INTERVAL_SECONDS,
  noShowGraceMinutes: ORDER_NO_SHOW_GRACE_MINUTES,
  adminPendingStatuses: ADMIN_PENDING_ORDER_STATUSES,
}));
