import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Offer } from './entities/offer.entity';
import { CreateOfferDto } from './admin/dto/create-offer.dto';
import { UpdateOfferDto } from './admin/dto/update-offer.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { OfferStatus } from '../../common/entities/enums/all.enums';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { OfferResponseDto } from './admin/dto/offer-response.dto';
import {
    AppOfferListResponseDto,
    OfferResponseDto as AppOfferResponseDto,
} from './app/dto/offer-response.dto';
import { DEFAULT_MESSAGES } from '../../common/constants/default-messages';
import { Business } from '../businesses/entities/business.entity';
import { S3UploadService } from '../../common/services/s3-upload.service';
import { UploadedFile } from '../../common/types/uploaded-file.type';
import { OfferPickupWindow } from './entities/offer-pickup-window.entity';

type OfferUploadFiles = {
    main_image_url?: UploadedFile[];
    gallery_images?: UploadedFile[];
};

@Injectable()
export class OffersService {
    constructor(
        @InjectRepository(Offer)
        private offersRepository: Repository<Offer>,
        @InjectRepository(OfferPickupWindow)
        private offerPickupWindowsRepository: Repository<OfferPickupWindow>,
        @InjectRepository(Business)
        private businessesRepository: Repository<Business>,
        private readonly s3UploadService: S3UploadService,
    ) { }

    async create(
        createOfferDto: CreateOfferDto,
        currentUser: any,
        files?: OfferUploadFiles,
    ): Promise<ApiResponseDto<null>> {
        const business = await this.businessesRepository.findOne({ where: { id: createOfferDto.business_id } });
        if (!business) throw new NotFoundException(`${DEFAULT_MESSAGES.BUSINESS.NOT_FOUND}: ${createOfferDto.business_id}`);

        const pickupStart = new Date(createOfferDto.pickup_start!);
        const pickupEnd = new Date(createOfferDto.pickup_end!);

        if (pickupEnd <= pickupStart) {
            throw new BadRequestException(DEFAULT_MESSAGES.OFFER.INVALID_PICKUP_WINDOW);
        }

        const fileUpdates = await this.buildOfferFileUpdates(files);
        const { oldUrlsToDelete: _unusedOldUrls, ...uploadedFileFields } = fileUpdates;

        const offer = this.offersRepository.create({
            ...createOfferDto,
            ...uploadedFileFields,
            original_price_minor: this.toMinorUnits(createOfferDto.original_price_minor),
            offer_price_minor: this.toMinorUnits(createOfferDto.offer_price_minor),
            pickup_start: pickupStart,
            pickup_end: pickupEnd,
            created_by_staff_id: currentUser?.id,
            quantity_remaining: createOfferDto.quantity_total,
            status: OfferStatus.DRAFT,
        });

        const created = await this.offersRepository.save(offer);

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.OFFER.CREATED,
            null,
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
            .leftJoinAndSelect('offer.business', 'business')
            .leftJoinAndSelect('offer.created_by_staff', 'created_by_staff')
            .leftJoinAndSelect('offer.updater', 'updater')
            .leftJoinAndSelect('offer.archiver', 'archiver')
            .leftJoinAndSelect('offer.pickup_windows', 'pickup_windows')
            .where('offer.is_archived = :isArchived', { isArchived: false });

        if (search) {
            query.andWhere('(offer.title ILIKE :search OR offer.description ILIKE :search)', { search: `%${search}%` });
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

    async findAllForApp(paginationDto: PaginationDto, queryParams?: any): Promise<ApiResponseDto<AppOfferListResponseDto[]>> {
        const { page = 1, limit = 10, order = 'DESC', search } = paginationDto;
        const query = this.offersRepository
            .createQueryBuilder('offer')
            .leftJoinAndSelect('offer.business', 'business')
            .leftJoinAndSelect('offer.category', 'category')
            .where('offer.is_archived = :isArchived', { isArchived: false })
            .andWhere('offer.status = :status', { status: OfferStatus.PUBLISHED });

        if (search) {
            query.andWhere('(offer.title ILIKE :search OR offer.short_description ILIKE :search)', { search: `%${search}%` });
        }

        if (queryParams?.business_id) {
            query.andWhere('offer.business_id = :business_id', { business_id: queryParams.business_id });
        }

        if (queryParams?.category_id) {
            query.andWhere('offer.category_id = :category_id', { category_id: queryParams.category_id });
        }

        if (queryParams?.lat !== undefined && queryParams?.lng !== undefined) {
            query.addSelect(`ST_Distance(business.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326))`, 'distance_meters');
            query.setParameter('lng', queryParams.lng);
            query.setParameter('lat', queryParams.lat);
        }

        query.orderBy('offer.created_at', order);
        query.skip((page - 1) * limit);
        query.take(limit);

        const total = await query.getCount();
        const { entities, raw } = await query.getRawAndEntities();

        const mapped = entities.map((offer) =>
            AppOfferListResponseDto.fromEntity(offer, raw.find((r) => r.offer_id === offer.id)),
        );

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.OFFER.LIST_FETCHED,
            mapped,
            { total, page, lastPage: Math.ceil(total / limit), limit },
        );
    }

    async findOneForApp(id: string, queryParams?: { lat?: number, lng?: number }): Promise<ApiResponseDto<AppOfferResponseDto>> {
        const query = this.offersRepository
            .createQueryBuilder('offer')
            .leftJoinAndSelect('offer.business', 'business')
            .leftJoinAndSelect('offer.category', 'category')
            .leftJoinAndSelect('offer.pickup_windows', 'pickup_windows')
            .where('offer.id = :id', { id })
            .andWhere('offer.is_archived = :isArchived', { isArchived: false })
            .andWhere('offer.status = :status', { status: OfferStatus.PUBLISHED });

        if (queryParams?.lat !== undefined && queryParams?.lng !== undefined) {
            query.addSelect(`ST_Distance(business.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326))`, 'distance_meters');
            query.setParameter('lng', queryParams.lng);
            query.setParameter('lat', queryParams.lat);
        }

        const { entities, raw } = await query.getRawAndEntities();
        if (!entities.length) throw new NotFoundException(`${DEFAULT_MESSAGES.OFFER.NOT_FOUND}: ${id}`);

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.OFFER.FETCHED,
            AppOfferResponseDto.fromEntity(entities[0]),
        );
    }

    async findOne(id: string): Promise<ApiResponseDto<OfferResponseDto>> {
        const offer = await this.offersRepository.findOne({
            where: { id, is_archived: false },
            relations: ['business', 'category', 'created_by_staff', 'updater', 'archiver', 'pickup_windows'],
        });
        if (!offer) throw new NotFoundException(`${DEFAULT_MESSAGES.OFFER.NOT_FOUND}: ${id}`);

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.OFFER.FETCHED,
            OfferResponseDto.fromEntity(offer),
        );
    }

    async update(
        id: string,
        updateOfferDto: UpdateOfferDto,
        currentUser: any,
        files?: OfferUploadFiles,
    ): Promise<ApiResponseDto<null>> {
        const offer = await this.offersRepository.findOne({
            where: { id, is_archived: false },
            relations: ['business'],
        });
        if (!offer) throw new NotFoundException(`${DEFAULT_MESSAGES.OFFER.NOT_FOUND}: ${id}`);

        const fileUpdates = await this.buildOfferFileUpdates(files, offer);
        const { oldUrlsToDelete, ...uploadedFileFields } = fileUpdates;

        const updatePayload: Partial<Offer> = {};
        if (updateOfferDto.business_id !== undefined) updatePayload.business_id = updateOfferDto.business_id;
        if (updateOfferDto.title !== undefined) updatePayload.title = updateOfferDto.title;
        if (updateOfferDto.description !== undefined) updatePayload.description = updateOfferDto.description;
        if (updateOfferDto.short_description !== undefined) updatePayload.short_description = updateOfferDto.short_description;
        if (updateOfferDto.tags !== undefined) updatePayload.tags = updateOfferDto.tags;
        if (updateOfferDto.dietary_info !== undefined) updatePayload.dietary_info = updateOfferDto.dietary_info;
        if (updateOfferDto.allergen_info !== undefined) updatePayload.allergen_info = updateOfferDto.allergen_info;
        if (updateOfferDto.main_image_url !== undefined) updatePayload.main_image_url = updateOfferDto.main_image_url;
        if (updateOfferDto.gallery_images !== undefined) updatePayload.gallery_images = updateOfferDto.gallery_images;
        if (updateOfferDto.original_price_minor !== undefined) {
            updatePayload.original_price_minor = this.toMinorUnits(updateOfferDto.original_price_minor);
        }
        if (updateOfferDto.offer_price_minor !== undefined) {
            updatePayload.offer_price_minor = this.toMinorUnits(updateOfferDto.offer_price_minor);
        }
        if (updateOfferDto.quantity_total !== undefined) updatePayload.quantity_total = updateOfferDto.quantity_total;
        if (updateOfferDto.max_per_user !== undefined) updatePayload.max_per_user = updateOfferDto.max_per_user;
        if (updateOfferDto.pickup_instructions !== undefined) updatePayload.pickup_instructions = updateOfferDto.pickup_instructions;
        if (updateOfferDto.contents !== undefined) updatePayload.contents = updateOfferDto.contents;
        if (updateOfferDto.is_order_time_limited !== undefined) updatePayload.is_order_time_limited = updateOfferDto.is_order_time_limited;

        if (updateOfferDto.order_cutoff_at !== undefined) updatePayload.order_cutoff_at = new Date(updateOfferDto.order_cutoff_at);

        if (updateOfferDto.pickup_start) updatePayload.pickup_start = new Date(updateOfferDto.pickup_start);
        if (updateOfferDto.pickup_end) updatePayload.pickup_end = new Date(updateOfferDto.pickup_end);

        const start = updatePayload.pickup_start || offer.pickup_start;
        const end = updatePayload.pickup_end || offer.pickup_end;
        if (end <= start) throw new BadRequestException(DEFAULT_MESSAGES.OFFER.INVALID_PICKUP_WINDOW);

        Object.assign(updatePayload, uploadedFileFields);
        updatePayload.updated_by = currentUser?.id;

        await this.offersRepository.update(id, updatePayload);


        if (oldUrlsToDelete.length) {
            await this.s3UploadService.deleteManyByUrls(oldUrlsToDelete);
        }

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.OFFER.UPDATED,
            null,
        );
    }

    async publish(id: string, currentUser: any): Promise<ApiResponseDto<null>> {
        const offer = await this.offersRepository.findOne({ where: { id, is_archived: false } });
        if (!offer) throw new NotFoundException(`${DEFAULT_MESSAGES.OFFER.NOT_FOUND}: ${id}`);

        offer.status = OfferStatus.PUBLISHED;
        offer.published_at = new Date();
        offer.updated_by = currentUser?.id;

        await this.offersRepository.save(offer);

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.OFFER.PUBLISHED,
            null,
        );
    }

    async pause(id: string, currentUser: any): Promise<ApiResponseDto<null>> {
        const offer = await this.offersRepository.findOne({ where: { id, is_archived: false } });
        if (!offer) throw new NotFoundException(`${DEFAULT_MESSAGES.OFFER.NOT_FOUND}: ${id}`);

        offer.status = OfferStatus.PAUSED;
        offer.paused_at = new Date();
        offer.updated_by = currentUser?.id;

        await this.offersRepository.save(offer);

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.OFFER.PAUSED,
            null,
        );
    }

    async remove(id: string, currentUser: any): Promise<ApiResponseDto<{ id: string }>> {
        const offer = await this.offersRepository.findOne({ where: { id, is_archived: false } });
        if (!offer) throw new NotFoundException(`${DEFAULT_MESSAGES.OFFER.NOT_FOUND}: ${id}`);

        offer.is_archived = true;
        offer.archived_by = currentUser?.id;
        offer.archived_at = new Date();
        await this.offersRepository.save(offer);

        return ApiResponseDto.success(DEFAULT_MESSAGES.OFFER.DELETED, { id });
    }

    private async buildOfferFileUpdates(
        files?: OfferUploadFiles,
        existingOffer?: Offer,
    ): Promise<{
        main_image_url?: string;
        gallery_images?: string[];
        oldUrlsToDelete: string[];
    }> {
        const oldUrlsToDelete: string[] = [];
        const updates: {
            main_image_url?: string;
            gallery_images?: string[];
            oldUrlsToDelete: string[];
        } = { oldUrlsToDelete };

        const mainImage = files?.main_image_url?.[0];
        if (mainImage) {
            updates.main_image_url = await this.s3UploadService.uploadFile(mainImage, 'offers/main-images');
            if (existingOffer?.main_image_url) oldUrlsToDelete.push(existingOffer.main_image_url);
        }

        const galleryImages = files?.gallery_images;
        if (galleryImages?.length) {
            updates.gallery_images = await this.s3UploadService.uploadFiles(galleryImages, 'offers/gallery');
            if (existingOffer?.gallery_images?.length) {
                oldUrlsToDelete.push(...existingOffer.gallery_images);
            }
        }

        return updates;
    }

    private toMinorUnits(amount: number): number {
        return Math.round(amount * 100);
    }

    private parsePickupWindows(
        pickupWindows?: Array<{
            starts_at: string;
            ends_at: string;
            max_pickups_per_window?: number;
        }>,
    ): Array<{ starts_at: Date; ends_at: Date; max_pickups_per_window?: number }> {
        if (!pickupWindows?.length) return [];

        return pickupWindows.map((window) => {
            const startsAt = new Date(window.starts_at);
            const endsAt = new Date(window.ends_at);

            if (endsAt <= startsAt) {
                throw new BadRequestException(DEFAULT_MESSAGES.OFFER.INVALID_PICKUP_WINDOW);
            }

            return {
                starts_at: startsAt,
                ends_at: endsAt,
                max_pickups_per_window: window.max_pickups_per_window,
            };
        });
    }
}
