import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { AdminUsersController } from './admin/admin-users.controller';
import { AppUsersController } from './app/app-users.controller';
import { AppUser } from './entities/app-user.entity';
import { UserDevice } from './entities/user-device.entity';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { S3Module } from '../../common/s3.module';
import { AuthModule } from '../auth/auth.module'; // Keep for backwards compatibility or global guards if needed

@Module({
    imports: [
        TypeOrmModule.forFeature([AppUser, UserDevice]),
        S3Module,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET') || 'your-super-secret-jwt-key',
                signOptions: { expiresIn: (configService.get<string>('JWT_EXPIRES_IN') || '15m') as any },
            }),
        }),
        AuthModule
    ],
    controllers: [AdminUsersController, AppUsersController],
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule { }
