import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { AppUser } from '../users/entities/app-user.entity';
import { UserStatus } from '../../common/entities/enums/all.enums';
import { UserRegisterDto, UserVerifyDto } from './dto/user-auth.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { DEFAULT_MESSAGES } from '../../common/constants/default-messages';
import { Country } from '../countries/entities/country.entity';
import { AuthOtpRequestResponseDto, AuthProfileResponseDto, AuthVerifyResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(AppUser)
        private usersRepository: Repository<AppUser>,
        @InjectRepository(Country)
        private countriesRepository: Repository<Country>,
        private jwtService: JwtService,
    ) { }

    private async resolveTimezoneByCountryCode(countryCode?: string | null): Promise<string> {
        if (!countryCode) return 'UTC';
        const country = await this.countriesRepository.findOne({ where: { iso_code_3166: countryCode.toUpperCase() } });
        return country?.default_timezone || 'UTC';
    }

    private getTimezoneTimestamp(timezone: string): string {
        return new Intl.DateTimeFormat('sv-SE', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        }).format(new Date());
    }

    async requestPhoneOtp(userDto: UserRegisterDto): Promise<ApiResponseDto<AuthOtpRequestResponseDto>> {
        let user = await this.usersRepository.findOne({ where: { phone_e164: userDto.phone } });

        if (!user) {
            user = this.usersRepository.create({
                phone_e164: userDto.phone,
                phone_country_code: userDto.phone_country_code?.toUpperCase(),
                first_name: userDto.first_name,
                last_name: userDto.last_name,
                email: `noemail_${userDto.phone.replace('+', '')}_${Date.now()}@kamacaash.local`,
                status: UserStatus.PENDING,
            });
            await this.usersRepository.save(user);
        }

        const timezone = await this.resolveTimezoneByCountryCode(user.phone_country_code);

        return ApiResponseDto.success(DEFAULT_MESSAGES.AUTH.OTP_SENT, {
            userId: user.id,
            isNewUser: user.status === UserStatus.PENDING,
            timezone,
            timestamp: this.getTimezoneTimestamp(timezone),
        });
    }

    async verifyPhoneOtp(verifyDto: UserVerifyDto): Promise<ApiResponseDto<AuthVerifyResponseDto>> {
        const user = await this.usersRepository.findOne({ where: { phone_e164: verifyDto.phone } });
        if (!user) throw new UnauthorizedException(DEFAULT_MESSAGES.AUTH.USER_NOT_FOUND);

        if (verifyDto.otp !== '123456') {
            throw new UnauthorizedException(DEFAULT_MESSAGES.AUTH.INVALID_OTP);
        }

        if (user.status === UserStatus.PENDING) {
            await this.usersRepository.update(user.id, { status: UserStatus.ACTIVE });
            user.status = UserStatus.ACTIVE;
        }

        const payload = { sub: user.id, role: 'CUSTOMER' };
        const timezone = await this.resolveTimezoneByCountryCode(user.phone_country_code);

        return ApiResponseDto.success(DEFAULT_MESSAGES.AUTH.OTP_VERIFIED, {
            access_token: this.jwtService.sign(payload),
            refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }),
            user,
            timezone,
            timestamp: this.getTimezoneTimestamp(timezone),
        });
    }

    async getProfile(currentUser: any): Promise<ApiResponseDto<AuthProfileResponseDto>> {
        const timezone = await this.resolveTimezoneByCountryCode(currentUser?.phone_country_code || currentUser?.country_code);

        return ApiResponseDto.success(DEFAULT_MESSAGES.AUTH.PROFILE_FETCHED, {
            user: currentUser,
            timezone,
            timestamp: this.getTimezoneTimestamp(timezone),
        });
    }
}
