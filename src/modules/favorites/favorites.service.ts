import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { DEFAULT_MESSAGES } from '../../common/constants/default-messages';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { FAVORITES_DEFAULT_LIMIT, FAVORITES_DEFAULT_PAGE } from '../../config/favorites.config';
import { Business } from '../businesses/entities/business.entity';
import { BusinessStatus, FavoriteSource } from '../../common/entities/enums/all.enums';
import { Favorite } from './entities/favorite.entity';
import { AddBusinessFavoriteDto } from './app/dto/add-business-favorite.dto';
import { AppFavoriteResponseDto } from './app/dto/app-favorite-response.dto';

@Injectable()
export class FavoritesService {
    constructor(
        @InjectRepository(Favorite)
        private favoritesRepository: Repository<Favorite>,
        @InjectRepository(Business)
        private businessesRepository: Repository<Business>,
        private readonly configService: ConfigService,
    ) { }

    async addBusinessFavorite(
        userId: string,
        businessId: string,
        dto: AddBusinessFavoriteDto,
    ): Promise<ApiResponseDto<AppFavoriteResponseDto>> {
        await this.getActiveBusinessOrThrow(businessId);

        let favorite = await this.favoritesRepository.findOne({
            where: { user_id: userId, business_id: businessId },
            relations: ['business', 'business.category'],
        });

        if (favorite && !favorite.is_removed) {
            favorite.note = dto.note ?? favorite.note;
            favorite.source = dto.source ?? favorite.source;
            const saved = await this.favoritesRepository.save(favorite);
            const withBusiness = await this.getFavoriteWithBusiness(saved.id);

            return ApiResponseDto.success(
                DEFAULT_MESSAGES.FAVORITE.ALREADY_ADDED,
                AppFavoriteResponseDto.fromEntity(withBusiness),
            );
        }

        if (favorite) {
            favorite.is_removed = false;
            favorite.is_visible = true;
            favorite.removed_at = null as any;
            favorite.source = dto.source ?? favorite.source ?? FavoriteSource.MANUAL;
            favorite.note = dto.note ?? favorite.note;
        } else {
            favorite = this.favoritesRepository.create({
                user_id: userId,
                business_id: businessId,
                source: dto.source ?? FavoriteSource.MANUAL,
                note: dto.note,
            });
        }

        const saved = await this.favoritesRepository.save(favorite);
        await this.businessesRepository.increment({ id: businessId }, 'total_favorites', 1);
        const withBusiness = await this.getFavoriteWithBusiness(saved.id);

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.FAVORITE.ADDED,
            AppFavoriteResponseDto.fromEntity(withBusiness),
        );
    }

    async removeBusinessFavorite(
        userId: string,
        businessId: string,
    ): Promise<ApiResponseDto<AppFavoriteResponseDto>> {
        const favorite = await this.favoritesRepository.findOne({
            where: { user_id: userId, business_id: businessId, is_removed: false },
            relations: ['business', 'business.category'],
        });

        if (!favorite) {
            throw new NotFoundException(`${DEFAULT_MESSAGES.FAVORITE.NOT_FOUND}: ${businessId}`);
        }

        favorite.is_removed = true;
        favorite.removed_at = new Date();
        const saved = await this.favoritesRepository.save(favorite);
        await this.businessesRepository
            .createQueryBuilder()
            .update(Business)
            .set({ total_favorites: () => 'GREATEST(total_favorites - 1, 0)' })
            .where('id = :businessId', { businessId })
            .execute();

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.FAVORITE.REMOVED,
            AppFavoriteResponseDto.fromEntity(saved),
        );
    }

    async getFavoriteBusinessesByUser(
        userId: string,
        paginationDto: PaginationDto,
    ): Promise<ApiResponseDto<AppFavoriteResponseDto[]>> {
        const defaultPage = this.configService.get<number>('favorites.defaultPage') ?? FAVORITES_DEFAULT_PAGE;
        const defaultLimit = this.configService.get<number>('favorites.defaultLimit') ?? FAVORITES_DEFAULT_LIMIT;
        const { page = defaultPage, limit = defaultLimit, order = 'DESC', search } = paginationDto;

        const query = this.favoritesRepository
            .createQueryBuilder('favorite')
            .leftJoinAndSelect('favorite.business', 'business')
            .leftJoinAndSelect('business.category', 'category')
            .where('favorite.user_id = :userId', { userId })
            .andWhere('favorite.is_removed = :isRemoved', { isRemoved: false })
            .andWhere('favorite.is_visible = :isVisible', { isVisible: true })
            .andWhere('business.is_archived = :isArchived', { isArchived: false })
            .andWhere('business.is_active = :isActive', { isActive: true })
            .andWhere('business.status = :status', { status: BusinessStatus.ACTIVE });

        if (search) {
            query.andWhere(
                '(business.display_name ILIKE :search OR business.short_description ILIKE :search OR category.name ILIKE :search)',
                { search: `%${search}%` },
            );
        }

        query.orderBy('favorite.created_at', order);
        query.skip((page - 1) * limit);
        query.take(limit);

        const [favorites, total] = await query.getManyAndCount();

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.FAVORITE.LIST_FETCHED,
            favorites.map((favorite) => AppFavoriteResponseDto.fromEntity(favorite)),
            { total, page, lastPage: Math.ceil(total / limit), limit },
        );
    }

    async toggle(userId: string, businessId: string) {
        const existing = await this.favoritesRepository.findOne({ where: { user_id: userId, business_id: businessId } });

        if (existing) {
            if (existing.is_removed) {
                existing.is_removed = false;
                existing.removed_at = null as any; // Cast to any to allow nulling date
                return this.favoritesRepository.save(existing);
            } else {
                existing.is_removed = true;
                existing.removed_at = new Date();
                return this.favoritesRepository.save(existing);
            }
        }

        const favorite = this.favoritesRepository.create({
            user_id: userId,
            business_id: businessId
        });
        return this.favoritesRepository.save(favorite);
    }

    async findAll(userId: string) {
        return this.favoritesRepository.find({
            where: { user_id: userId, is_removed: false },
            relations: ['business']
        });
    }

    private async getActiveBusinessOrThrow(businessId: string): Promise<Business> {
        const business = await this.businessesRepository.findOne({
            where: {
                id: businessId,
                is_archived: false,
                is_active: true,
                status: BusinessStatus.ACTIVE,
            },
        });

        if (!business) throw new NotFoundException(`${DEFAULT_MESSAGES.BUSINESS.NOT_FOUND}: ${businessId}`);

        return business;
    }

    private async getFavoriteWithBusiness(id: string): Promise<Favorite> {
        const favorite = await this.favoritesRepository.findOne({
            where: { id },
            relations: ['business', 'business.category'],
        });

        if (!favorite) throw new NotFoundException(`${DEFAULT_MESSAGES.FAVORITE.NOT_FOUND}: ${id}`);

        return favorite;
    }
}
