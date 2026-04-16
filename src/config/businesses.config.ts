import { registerAs } from '@nestjs/config';

const toPositiveNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const APP_BUSINESS_ACTIVE_OFFERS_LIMIT = toPositiveNumber(
  process.env.APP_BUSINESS_ACTIVE_OFFERS_LIMIT,
  10,
);

export default registerAs('businesses', () => ({
  appActiveOffersLimit: APP_BUSINESS_ACTIVE_OFFERS_LIMIT,
}));
