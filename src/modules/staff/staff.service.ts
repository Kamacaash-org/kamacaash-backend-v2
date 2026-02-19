import { Injectable, NotFoundException, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
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
import { StaffAuthUserDto } from './dto/staff-auth-user.dto';
import { Country } from '../countries/entities/country.entity';

@Injectable()
export class StaffService {
    constructor(
        @InjectRepository(StaffUser)
        private staffRepository: Repository<StaffUser>,
        @InjectRepository(Country)
        private countryRepository: Repository<Country>,
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
        const payload = { sub: staff.id, username: staff.username, country_code: staff.country_code, role: staff.role };
        return {
            access_token: this.jwtService.sign(payload),
            refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }),
            user: StaffAuthUserDto.toAuthUser(staff),
        };
    }

    async create(createStaffDto: CreateStaffDto, currentUser: any): Promise<ApiResponseDto<StaffResponseDto>> {

        // console.log('Creating staff with data:', createStaffDto);
        // console.log('Current user from token:', currentUser);
        const countryCodeFromToken = currentUser.country_code;
        const created_by = currentUser.id;


        const country = await this.countryRepository.findOne({
            where: { iso_code_3166: countryCodeFromToken },
        });

        if (!country) {
            throw new BadRequestException('Invalid country from token');
        }

        const existing = await this.staffRepository.findOne({
            where: [{ email: createStaffDto.email }, { phone_e164: createStaffDto.phone_e164 }],
        });

        if (existing) {
            if (existing.phone_e164 === createStaffDto.phone_e164) {
                throw new ConflictException(DEFAULT_MESSAGES.STAFF.PHONE_ALREADY_EXISTS);
            }
            throw new ConflictException(DEFAULT_MESSAGES.STAFF.EMAIL_ALREADY_EXISTS);
        }

        const password = createStaffDto.password;
        const password_hash = await bcrypt.hash(password, 10);

        const staff = this.staffRepository.create({
            email: createStaffDto.email,
            username: createStaffDto.username,
            // 🔥 from token
            country_code: country.iso_code_3166,
            phone_code: country.phone_code,
            created_by: created_by,
            phone_e164: createStaffDto.phone_e164,
            first_name: createStaffDto.first_name,
            last_name: createStaffDto.last_name,
            full_name: `${createStaffDto.first_name} ${createStaffDto.last_name}`,
            profile_image_url: createStaffDto.profile_image_url,
            sex: createStaffDto.sex,
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

        if (updateStaffDto.first_name || updateStaffDto.last_name) {
            payload.full_name = `${updateStaffDto.first_name ?? staff.first_name} ${updateStaffDto.last_name ?? staff.last_name}`;
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
