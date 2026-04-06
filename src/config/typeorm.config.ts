// import { DataSource } from 'typeorm';
// import { config } from 'dotenv';
// import { ConfigService } from '@nestjs/config';

// config();

// const configService = new ConfigService();

// export default new DataSource({
//     type: 'postgres',
//     host: process.env.DB_HOST || 'localhost',
//     port: parseInt(process.env.DB_PORT || '5432', 10),
//     username: process.env.DB_USERNAME || 'kamacaash-user',
//     password: process.env.DB_PASSWORD || '123',
//     database: process.env.DB_NAME || 'kamacaash-dev',
//     ssl: process.env.NODE_ENV === 'production'
//         ? { rejectUnauthorized: false }
//         : false,
//     entities: ['src/**/*.entity.ts'],
//     migrations: ['src/migrations/*.ts'],
//     synchronize: true, // Always false for CLI/production, migrations only
// });


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
    synchronize: false, // ✅ for now (dev)
});