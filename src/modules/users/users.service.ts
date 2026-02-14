import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppUser } from './entities/app-user.entity';
import { UserStatus } from '../../common/entities/enums/all.enums';
import { PaginationDto, PaginatedResponseDto } from '../../common/dto/pagination.dto';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(AppUser)
        private usersRepository: Repository<AppUser>,
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
}
