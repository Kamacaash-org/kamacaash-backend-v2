import { registerAs } from '@nestjs/config';
import { OrderStatus } from '../common/entities/enums/all.enums';

const toPositiveNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const ORDER_HOLD_MINUTES = 3;
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
  noShowGraceMinutes: ORDER_NO_SHOW_GRACE_MINUTES,
  adminPendingStatuses: ADMIN_PENDING_ORDER_STATUSES,
}));
