import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppUser } from './entities/app-user.entity';
import { UserDevice } from './entities/user-device.entity';
import { UserRole, UserStatus } from '../../common/entities/enums/all.enums';
import { PaginationDto, PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { RegisterAppUserDto, VerifyAppUserDto, ResendOtpDto, UpdateAppUserProfileDto } from './app/dto/app-user-auth.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { DEFAULT_MESSAGES } from '../../common/constants/default-messages';
import { JwtService } from '@nestjs/jwt';
import { S3UploadService } from '../../common/services/s3-upload.service';
import { UploadedFile } from '../../common/types/uploaded-file.type';

type ProfileUploadFiles = {
    profile_image_url?: UploadedFile[];
};

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(AppUser)
        private usersRepository: Repository<AppUser>,
        @InjectRepository(UserDevice)
        private userDevicesRepository: Repository<UserDevice>,
        private jwtService: JwtService,
        private s3UploadService: S3UploadService,
    ) { }

    async findAll(paginationDto: PaginationDto): Promise<PaginatedResponseDto<AppUser>> {
        const { page = 1, limit = 10, order = 'DESC', search } = paginationDto;
        const query = this.usersRepository.createQueryBuilder('user');

        if (search) {
            query.where('user.email ILIKE :search OR user.phone_e164 ILIKE :search OR user.first_name ILIKE :search OR user.last_name ILIKE :search', { search: `%${search}%` });
        }

        query.orderBy('user.created_at', order);
        query.skip((page - 1) * limit);
        query.take(limit);

        const [data, total] = await query.getManyAndCount();

        return {
            data,
            meta: {
                total,
                page,
                lastPage: Math.ceil(total / limit),
                limit,
            },
        };
    }

    async findOne(id: string): Promise<AppUser> {
        const user = await this.usersRepository.findOne({ where: { id } });
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }
        return user;
    }

    async findByPhone(phone: string): Promise<AppUser | undefined> {
        const user = await this.usersRepository.findOne({ where: { phone_e164: phone } });
        return user || undefined;
    }

    async remove(id: string): Promise<void> {
        await this.usersRepository.softDelete(id);
    }

    async updateStatus(id: string, status: UserStatus): Promise<AppUser> {
        await this.usersRepository.update(id, { status });
        return this.findOne(id);
    }

    // --- APP USER APIs ---

    async registerFromApp(dto: RegisterAppUserDto): Promise<ApiResponseDto<any>> {
        let user = await this.usersRepository.findOne({ where: { phone_e164: dto.phone } });

        if (!user) {
            user = this.usersRepository.create({
                phone_e164: dto.phone,
                phone_country_code: dto.phone_country_code?.toUpperCase(),
                email: `noemail_${dto.phone.replace('+', '')}_${Date.now()}@kamacaash.local`,
                status: UserStatus.PENDING,
            });
            user = await this.usersRepository.save(user);
        }

        if (dto.device_id) {
            await this.upsertDevice(user.id, dto);
        }

        return ApiResponseDto.success(DEFAULT_MESSAGES.AUTH.OTP_SENT, {
            userId: user.id,
            isNewUser: user.status === UserStatus.PENDING,
        });
    }

    async verifyOtpFromApp(dto: VerifyAppUserDto): Promise<ApiResponseDto<any>> {
        const user = await this.usersRepository.findOne({ where: { phone_e164: dto.phone } });
        if (!user) throw new UnauthorizedException(DEFAULT_MESSAGES.AUTH.USER_NOT_FOUND);

        if (dto.otp !== '123456') { // Mock OTP
            throw new UnauthorizedException(DEFAULT_MESSAGES.AUTH.INVALID_OTP);
        }

        let isNewUser = false;
        if (user.status === UserStatus.PENDING) {
            await this.usersRepository.update(user.id, { status: UserStatus.ACTIVE });
            user.status = UserStatus.ACTIVE;
            isNewUser = true;
        }

        await this.usersRepository.update(user.id, { last_login_at: new Date(), phone_verified: true, verified_at: new Date(), otp_verified_at: new Date() });

        const payload = { sub: user.id, role: UserRole.USER };

        return ApiResponseDto.success(DEFAULT_MESSAGES.AUTH.OTP_VERIFIED, {
            access_token: this.jwtService.sign(payload),
            refresh_token: this.jwtService.sign(payload),
            // user,
            isNewUser
        });
    }

    async resendOtpFromApp(dto: ResendOtpDto): Promise<ApiResponseDto<any>> {
        const user = await this.usersRepository.findOne({ where: { phone_e164: dto.phone } });
        if (!user) throw new UnauthorizedException(DEFAULT_MESSAGES.AUTH.USER_NOT_FOUND);

        return ApiResponseDto.success(DEFAULT_MESSAGES.AUTH.OTP_SENT, {
            userId: user.id,
        });
    }

    async getProfileFromApp(currentUser: any): Promise<ApiResponseDto<any>> {
        const user = await this.findOne(currentUser.id);
        return ApiResponseDto.success(DEFAULT_MESSAGES.AUTH.PROFILE_FETCHED, { user });
    }

    async updateProfileFromApp(userId: string, dto: UpdateAppUserProfileDto, files?: ProfileUploadFiles): Promise<ApiResponseDto<any>> {
        const updatePayload: Partial<AppUser> = {};

        if (dto.first_name) updatePayload.first_name = dto.first_name;
        if (dto.last_name) updatePayload.last_name = dto.last_name;
        if (dto.email) updatePayload.email = dto.email;
        if (dto.preferred_language) updatePayload.preferred_language = dto.preferred_language;
        if (dto.preferred_currency) updatePayload.preferred_currency = dto.preferred_currency;

        const mainImage = files?.profile_image_url?.[0];
        if (mainImage) {
            const user = await this.findOne(userId);
            const newUrl = await this.s3UploadService.uploadFile(mainImage, 'users/avatars');
            updatePayload.profile_image_url = newUrl;

            if (user.profile_image_url) {
                await this.s3UploadService.deleteByUrl(user.profile_image_url);
            }
        }

        if (Object.keys(updatePayload).length > 0) {
            await this.usersRepository.update(userId, updatePayload);
        }

        const updatedUser = await this.findOne(userId);
        return ApiResponseDto.success('Profile updated successfully', { user: updatedUser });
    }

    private async upsertDevice(userId: string, dto: RegisterAppUserDto) {
        let device = await this.userDevicesRepository.findOne({ where: { device_id: dto.device_id, user_id: userId } });

        if (device) {
            device.last_used_at = new Date();
            device.push_token = dto.push_token || device.push_token;
            device.app_version = dto.app_version || device.app_version;
            device.os_version = dto.os_version || device.os_version;
            device.device_name = dto.device_name || device.device_name;
            await this.userDevicesRepository.save(device);
        } else {
            device = this.userDevicesRepository.create({
                user_id: userId,
                device_id: dto.device_id,
                device_type: dto.device_type || 'unknown',
                device_name: dto.device_name,
                device_model: dto.device_model,
                os_version: dto.os_version,
                app_version: dto.app_version,
                push_token: dto.push_token,
            });
            await this.userDevicesRepository.save(device);
        }

        const deviceData = {
            device_id: device.device_id,
            device_type: device.device_type,
            os: device.os_version,
        } as Record<string, any>;
        await this.usersRepository.update(userId, { last_login_device: deviceData });
    }
}
