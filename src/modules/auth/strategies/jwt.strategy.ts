import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppUser } from '../../users/entities/app-user.entity';
import { StaffUser } from '../../staff/entities/staff-user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        @InjectRepository(AppUser)
        private usersRepository: Repository<AppUser>,
        @InjectRepository(StaffUser)
        private staffRepository: Repository<StaffUser>,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET') || 'your-super-secret-jwt-key',
        });
    }

    async validate(payload: any) {
        let user;
        if (payload.role === 'CUSTOMER') {
            user = await this.usersRepository.findOne({ where: { id: payload.sub } });
        } else {
            user = await this.staffRepository.findOne({ where: { id: payload.sub } });
        }

        if (!user) {
            throw new UnauthorizedException();
        }
        return user;
    }
}
