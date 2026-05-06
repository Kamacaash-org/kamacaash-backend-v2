
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
    type: 'postgres',
    url: process.env.DATABASE_URL, // ✅ USE THIS

    ssl: {
        rejectUnauthorized: false, // ✅ REQUIRED FOR NEON
    },

    entities: [__dirname + '/../**/*.entity{.ts,.js}'],

    synchronize: false, // dev only: auto-sync schema from entities

    logging: false,
}));
