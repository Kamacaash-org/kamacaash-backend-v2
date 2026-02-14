import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AppUser } from '../users/entities/app-user.entity';
import { StaffUser } from '../staff/entities/staff-user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtStrategy } from './strategies/jwt.strategy';
import { Country } from '../countries/entities/country.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([AppUser, StaffUser, Country]),
        PassportModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET') || 'your-super-secret-jwt-key',
                signOptions: { expiresIn: (configService.get<string>('JWT_EXPIRES_IN') || '15m') as any },
            }),
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy],
    exports: [AuthService],
})
export class AuthModule { }
