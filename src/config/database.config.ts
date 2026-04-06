// import { registerAs } from '@nestjs/config';

// export default registerAs('database', () => ({
//     type: 'postgres',
//     host: process.env.DB_HOST || 'localhost',
//     port: parseInt(process.env.DB_PORT || '5432', 10),
//     username: process.env.DB_USERNAME || 'kamacaash-user',
//     password: process.env.DB_PASSWORD || '123',
//     database: process.env.DB_NAME || 'kamacaash-dev',
//     ssl: process.env.NODE_ENV === 'production'
//         ? { rejectUnauthorized: false }
//         : false,
//     entities: [__dirname + '/../**/*.entity{.ts,.js}'],
//     synchronize: process.env.NODE_ENV === 'development',
//     logging: process.env.NODE_ENV === 'test',
//     migrations: [__dirname + '/../migrations/*{.ts,.js}'],
//     cli: {
//         migrationsDir: 'src/migrations',
//     },
// }));

import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
    type: 'postgres',
    url: process.env.DATABASE_URL, // ✅ USE THIS

    ssl: {
        rejectUnauthorized: false, // ✅ REQUIRED FOR NEON
    },

    entities: [__dirname + '/../**/*.entity{.ts,.js}'],

    synchronize: false, // ✅ FORCE for now (dev)

    logging: false,

    migrations: [__dirname + '/../migrations/*{.ts,.js}'],

    cli: {
        migrationsDir: 'src/migrations',
    },
}));