import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Offer } from './entities/offer.entity';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { OfferStatus } from '../../common/entities/enums/all.enums';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { OfferResponseDto } from './dto/offer-response.dto';
import { DEFAULT_MESSAGES } from '../../common/constants/default-messages';
import { Business } from '../businesses/entities/business.entity';

@Injectable()
export class OffersService {
    constructor(
        @InjectRepository(Offer)
        private offersRepository: Repository<Offer>,
        @InjectRepository(Business)
        private businessesRepository: Repository<Business>,
    ) { }

    async create(createOfferDto: CreateOfferDto, staffId?: string): Promise<ApiResponseDto<OfferResponseDto>> {
        const business = await this.businessesRepository.findOne({ where: { id: createOfferDto.business_id } });
        if (!business) throw new NotFoundException(`${DEFAULT_MESSAGES.BUSINESS.NOT_FOUND}: ${createOfferDto.business_id}`);

        const pickupStart = new Date(createOfferDto.pickup_start);
        const pickupEnd = new Date(createOfferDto.pickup_end);
        if (pickupEnd <= pickupStart) {
            throw new BadRequestException(DEFAULT_MESSAGES.OFFER.INVALID_PICKUP_WINDOW);
        }

        const offer = this.offersRepository.create({
            ...createOfferDto,
            currency_code: business.currency_code,
            pickup_start: pickupStart,
            pickup_end: pickupEnd,
            created_by_staff_id: staffId,
            quantity_remaining: createOfferDto.quantity_total,
            slug: this.generateSlug(createOfferDto.title),
            status: OfferStatus.PUBLISHED,
        });

        const created = await this.offersRepository.save(offer);
        const withBusiness = await this.offersRepository.findOne({ where: { id: created.id }, relations: ['business'] });
        if (!withBusiness) throw new NotFoundException(`${DEFAULT_MESSAGES.OFFER.NOT_FOUND}: ${created.id}`);

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.OFFER.CREATED,
            OfferResponseDto.fromEntity(withBusiness),
        );
    }

    generateSlug(name: string): string {
        const slug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');
        return `${slug}-${Date.now().toString().slice(-6)}`;
    }

    async findAll(paginationDto: PaginationDto, queryParams?: any): Promise<ApiResponseDto<OfferResponseDto[]>> {
        const { page = 1, limit = 10, order = 'DESC', search } = paginationDto;
        const query = this.offersRepository
            .createQueryBuilder('offer')
            .leftJoinAndSelect('offer.business', 'business');

        if (search) {
            query.where('offer.title ILIKE :search OR offer.description ILIKE :search', { search: `%${search}%` });
        }

        if (queryParams?.business_id) {
            query.andWhere('offer.business_id = :business_id', { business_id: queryParams.business_id });
        }

        query.orderBy('offer.created_at', order);
        query.skip((page - 1) * limit);
        query.take(limit);

        const [data, total] = await query.getManyAndCount();

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.OFFER.LIST_FETCHED,
            data.map((offer) => OfferResponseDto.fromEntity(offer)),
            { total, page, lastPage: Math.ceil(total / limit), limit },
        );
    }

    async findOne(id: string): Promise<ApiResponseDto<OfferResponseDto>> {
        const offer = await this.offersRepository.findOne({ where: { id }, relations: ['business', 'category'] });
        if (!offer) throw new NotFoundException(`${DEFAULT_MESSAGES.OFFER.NOT_FOUND}: ${id}`);

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.OFFER.FETCHED,
            OfferResponseDto.fromEntity(offer),
        );
    }

    async update(id: string, updateOfferDto: UpdateOfferDto): Promise<ApiResponseDto<OfferResponseDto>> {
        const offer = await this.offersRepository.findOne({ where: { id }, relations: ['business'] });
        if (!offer) throw new NotFoundException(`${DEFAULT_MESSAGES.OFFER.NOT_FOUND}: ${id}`);

        const updatePayload: Partial<Offer> = {};
        if (updateOfferDto.business_id !== undefined) updatePayload.business_id = updateOfferDto.business_id;
        if (updateOfferDto.category_id !== undefined) updatePayload.category_id = updateOfferDto.category_id;
        if (updateOfferDto.title !== undefined) updatePayload.title = updateOfferDto.title;
        if (updateOfferDto.description !== undefined) updatePayload.description = updateOfferDto.description;
        if (updateOfferDto.short_description !== undefined) updatePayload.short_description = updateOfferDto.short_description;
        if (updateOfferDto.tags !== undefined) updatePayload.tags = updateOfferDto.tags;
        if (updateOfferDto.dietary_info !== undefined) updatePayload.dietary_info = updateOfferDto.dietary_info;
        if (updateOfferDto.allergen_info !== undefined) updatePayload.allergen_info = updateOfferDto.allergen_info;
        if (updateOfferDto.main_image_url !== undefined) updatePayload.main_image_url = updateOfferDto.main_image_url;
        if (updateOfferDto.gallery_images !== undefined) updatePayload.gallery_images = updateOfferDto.gallery_images;
        if (updateOfferDto.original_price_minor !== undefined) updatePayload.original_price_minor = updateOfferDto.original_price_minor;
        if (updateOfferDto.offer_price_minor !== undefined) updatePayload.offer_price_minor = updateOfferDto.offer_price_minor;
        if (updateOfferDto.quantity_total !== undefined) updatePayload.quantity_total = updateOfferDto.quantity_total;
        if (updateOfferDto.max_per_user !== undefined) updatePayload.max_per_user = updateOfferDto.max_per_user;
        if (updateOfferDto.pickup_instructions !== undefined) updatePayload.pickup_instructions = updateOfferDto.pickup_instructions;

        if (updateOfferDto.business_id) {
            const business = await this.businessesRepository.findOne({ where: { id: updateOfferDto.business_id } });
            if (!business) throw new NotFoundException(`${DEFAULT_MESSAGES.BUSINESS.NOT_FOUND}: ${updateOfferDto.business_id}`);
            updatePayload.currency_code = business.currency_code;
        } else {
            updatePayload.currency_code = offer.business?.currency_code || offer.currency_code;
        }

        if (updateOfferDto.pickup_start) updatePayload.pickup_start = new Date(updateOfferDto.pickup_start);
        if (updateOfferDto.pickup_end) updatePayload.pickup_end = new Date(updateOfferDto.pickup_end);

        const start = updatePayload.pickup_start || offer.pickup_start;
        const end = updatePayload.pickup_end || offer.pickup_end;
        if (end <= start) throw new BadRequestException(DEFAULT_MESSAGES.OFFER.INVALID_PICKUP_WINDOW);

        await this.offersRepository.update(id, updatePayload);

        const updated = await this.offersRepository.findOne({ where: { id }, relations: ['business', 'category'] });
        if (!updated) throw new NotFoundException(`${DEFAULT_MESSAGES.OFFER.NOT_FOUND}: ${id}`);

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.OFFER.UPDATED,
            OfferResponseDto.fromEntity(updated),
        );
    }

    async remove(id: string): Promise<ApiResponseDto<{ id: string }>> {
        const offer = await this.offersRepository.findOne({ where: { id } });
        if (!offer) throw new NotFoundException(`${DEFAULT_MESSAGES.OFFER.NOT_FOUND}: ${id}`);

        await this.offersRepository.softDelete(id);

        return ApiResponseDto.success(DEFAULT_MESSAGES.OFFER.DELETED, { id });
    }
}
