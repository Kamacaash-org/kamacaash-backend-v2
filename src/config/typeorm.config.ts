import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

export default new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL, // ✅ use Neon URL
    ssl: {
        rejectUnauthorized: false, // ✅ required for Neon
    },
    entities: ['src/**/*.entity.ts'],
    migrations: ['src/migrations/*.ts'],
    synchronize: false, // dev only: auto-sync schema from entities
});
