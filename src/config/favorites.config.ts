import { registerAs } from '@nestjs/config';

export const FAVORITES_DEFAULT_PAGE = 1;
export const FAVORITES_DEFAULT_LIMIT = 20;

export default registerAs('favorites', () => ({
  defaultPage: FAVORITES_DEFAULT_PAGE,
  defaultLimit: FAVORITES_DEFAULT_LIMIT,
}));
