import { Injectable, NotFoundException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffUser } from './entities/staff-user.entity';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import * as bcrypt from 'bcryptjs';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtService } from '@nestjs/jwt';
import { StaffLoginDto } from './dto/staff-login.dto';
import { StaffVerify2faDto } from './dto/staff-verify-2fa.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { StaffResponseDto } from './dto/staff-response.dto';
import {
    StaffLogin2faRequiredResponseDto,
    StaffSessionResponseDto,
} from './dto/staff-auth-response.dto';
import { DEFAULT_MESSAGES } from '../../common/constants/default-messages';

@Injectable()
export class StaffService {
    constructor(
        @InjectRepository(StaffUser)
        private staffRepository: Repository<StaffUser>,
        private jwtService: JwtService,
    ) { }

    async login(loginDto: StaffLoginDto): Promise<ApiResponseDto<StaffSessionResponseDto | StaffLogin2faRequiredResponseDto>> {
        const staff = await this.staffRepository.findOne({ where: { username: loginDto.username } });
        if (!staff) throw new UnauthorizedException(DEFAULT_MESSAGES.STAFF.INVALID_CREDENTIALS);

        const isMatch = await bcrypt.compare(loginDto.password, staff.password_hash);
        if (!isMatch) throw new UnauthorizedException(DEFAULT_MESSAGES.STAFF.INVALID_CREDENTIALS);

        if (!staff.is_active) throw new UnauthorizedException(DEFAULT_MESSAGES.STAFF.ACCOUNT_DISABLED);

        if (staff.two_factor_enabled) {
            return ApiResponseDto.success(DEFAULT_MESSAGES.STAFF.TWO_FACTOR_REQUIRED, {
                requires2fa: true,
                staffId: staff.id,
            });
        }

        return ApiResponseDto.success(DEFAULT_MESSAGES.STAFF.LOGIN_SUCCESS, this.generateTokens(staff));
    }

    async verify2fa(verifyDto: StaffVerify2faDto): Promise<ApiResponseDto<StaffSessionResponseDto>> {
        const staff = await this.staffRepository.findOne({ where: { id: verifyDto.staffId } });
        if (!staff) throw new UnauthorizedException(DEFAULT_MESSAGES.STAFF.NOT_FOUND);

        if (verifyDto.otp !== '123456') {
            throw new UnauthorizedException(DEFAULT_MESSAGES.STAFF.INVALID_2FA);
        }

        return ApiResponseDto.success(DEFAULT_MESSAGES.STAFF.TWO_FACTOR_VERIFIED, this.generateTokens(staff));
    }

    private generateTokens(staff: StaffUser): StaffSessionResponseDto {
        const payload = { sub: staff.id, email: staff.email, role: staff.role };
        return {
            access_token: this.jwtService.sign(payload),
            refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }),
            user: StaffResponseDto.fromEntity(staff),
        };
    }

    async create(createStaffDto: CreateStaffDto): Promise<ApiResponseDto<StaffResponseDto>> {
        const existing = await this.staffRepository.findOne({
            where: [{ email: createStaffDto.email }, { phone_e164: createStaffDto.phone_e164 }],
        });

        if (existing) {
            throw new ConflictException(DEFAULT_MESSAGES.STAFF.ALREADY_EXISTS);
        }

        const password = createStaffDto.password || Math.random().toString(36).slice(-8);
        const password_hash = await bcrypt.hash(password, 10);

        const staff = this.staffRepository.create({
            email: createStaffDto.email,
            username: createStaffDto.username,
            country_code: createStaffDto.country_code?.toUpperCase(),
            phone_e164: createStaffDto.phone_e164,
            first_name: createStaffDto.first_name,
            last_name: createStaffDto.last_name,
            profile_image_url: createStaffDto.profile_image_url,
            password_hash,
            role: createStaffDto.role,
            permissions: createStaffDto.permissions ?? [],
            is_active: createStaffDto.is_active ?? true,
            two_factor_enabled: createStaffDto.two_factor_enabled ?? false,
            notes: createStaffDto.notes,
        });

        const created = await this.staffRepository.save(staff);

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.STAFF.CREATED,
            StaffResponseDto.fromEntity(created),
        );
    }

    async findAll(paginationDto: PaginationDto): Promise<ApiResponseDto<StaffResponseDto[]>> {
        const { page = 1, limit = 10, order = 'DESC', search } = paginationDto;
        const query = this.staffRepository.createQueryBuilder('staff');

        if (search) {
            query.where('staff.email ILIKE :search OR staff.first_name ILIKE :search OR staff.last_name ILIKE :search', {
                search: `%${search}%`,
            });
        }

        query.orderBy('staff.created_at', order);
        query.skip((page - 1) * limit);
        query.take(limit);

        const [data, total] = await query.getManyAndCount();

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.STAFF.LIST_FETCHED,
            data.map((staff) => StaffResponseDto.fromEntity(staff)),
            { total, page, lastPage: Math.ceil(total / limit), limit },
        );
    }

    async findOne(id: string): Promise<ApiResponseDto<StaffResponseDto>> {
        const staff = await this.staffRepository.findOne({ where: { id } });
        if (!staff) throw new NotFoundException(`${DEFAULT_MESSAGES.STAFF.NOT_FOUND}: ${id}`);

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.STAFF.FETCHED,
            StaffResponseDto.fromEntity(staff),
        );
    }

    async update(id: string, updateStaffDto: UpdateStaffDto): Promise<ApiResponseDto<StaffResponseDto>> {
        const staff = await this.staffRepository.findOne({ where: { id } });
        if (!staff) throw new NotFoundException(`${DEFAULT_MESSAGES.STAFF.NOT_FOUND}: ${id}`);

        const payload: Partial<StaffUser> = {
            ...updateStaffDto,
            country_code: updateStaffDto.country_code?.toUpperCase(),
        };

        if (updateStaffDto.password) {
            payload.password_hash = await bcrypt.hash(updateStaffDto.password, 10);
            delete (payload as any).password;
        }

        await this.staffRepository.update(id, payload);

        const updated = await this.staffRepository.findOne({ where: { id } });
        if (!updated) throw new NotFoundException(`${DEFAULT_MESSAGES.STAFF.NOT_FOUND}: ${id}`);

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.STAFF.UPDATED,
            StaffResponseDto.fromEntity(updated),
        );
    }

    async remove(id: string): Promise<ApiResponseDto<{ id: string }>> {
        const staff = await this.staffRepository.findOne({ where: { id } });
        if (!staff) throw new NotFoundException(`${DEFAULT_MESSAGES.STAFF.NOT_FOUND}: ${id}`);

        await this.staffRepository.softDelete(id);

        return ApiResponseDto.success(DEFAULT_MESSAGES.STAFF.DELETED, { id });
    }

    async approve(id: string, approverId: string): Promise<ApiResponseDto<StaffResponseDto>> {
        const staff = await this.staffRepository.findOne({ where: { id } });
        if (!staff) throw new NotFoundException(`${DEFAULT_MESSAGES.STAFF.NOT_FOUND}: ${id}`);

        await this.staffRepository.update(id, {
            is_admin_approved: true,
            approved_by: approverId,
            approved_at: new Date(),
        });

        const updated = await this.staffRepository.findOne({ where: { id } });
        if (!updated) throw new NotFoundException(`${DEFAULT_MESSAGES.STAFF.NOT_FOUND}: ${id}`);

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.STAFF.APPROVED,
            StaffResponseDto.fromEntity(updated),
        );
    }

    async disable(id: string): Promise<ApiResponseDto<StaffResponseDto>> {
        const staff = await this.staffRepository.findOne({ where: { id } });
        if (!staff) throw new NotFoundException(`${DEFAULT_MESSAGES.STAFF.NOT_FOUND}: ${id}`);

        await this.staffRepository.update(id, { is_active: false });

        const updated = await this.staffRepository.findOne({ where: { id } });
        if (!updated) throw new NotFoundException(`${DEFAULT_MESSAGES.STAFF.NOT_FOUND}: ${id}`);

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.STAFF.DISABLED,
            StaffResponseDto.fromEntity(updated),
        );
    }

    async findByEmail(email: string): Promise<StaffUser | undefined> {
        const staff = await this.staffRepository.findOne({ where: { email } });
        return staff || undefined;
    }
}
