import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StaffService } from './staff.service';
import { StaffController } from './staff.controller';
import { StaffUser } from './entities/staff-user.entity';
import { AuthModule } from '../auth/auth.module';
import { Country } from '../countries/entities/country.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([StaffUser, Country]),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: (configService.get<string>('JWT_EXPIRES_IN') || '1d') as any },
            }),
        }),
        AuthModule
    ],
    controllers: [StaffController],
    providers: [StaffService],
    exports: [StaffService],
})
export class StaffModule { }
