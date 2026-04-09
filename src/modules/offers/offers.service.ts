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
    ): Promise<ApiResponseDto<OfferResponseDto>> {
        const business = await this.businessesRepository.findOne({ where: { id: createOfferDto.business_id } });
        if (!business) throw new NotFoundException(`${DEFAULT_MESSAGES.BUSINESS.NOT_FOUND}: ${createOfferDto.business_id}`);

        const parsedPickupWindows = this.parsePickupWindows(createOfferDto.pickup_windows);
        const hasPickupWindows = parsedPickupWindows.length > 0;

        if (!hasPickupWindows && (!createOfferDto.pickup_start || !createOfferDto.pickup_end)) {
            throw new BadRequestException('Provide pickup_start/pickup_end or pickup_windows');
        }

        const pickupStart = hasPickupWindows
            ? parsedPickupWindows.reduce((min, w) => (w.starts_at < min ? w.starts_at : min), parsedPickupWindows[0].starts_at)
            : new Date(createOfferDto.pickup_start!);
        const pickupEnd = hasPickupWindows
            ? parsedPickupWindows.reduce((max, w) => (w.ends_at > max ? w.ends_at : max), parsedPickupWindows[0].ends_at)
            : new Date(createOfferDto.pickup_end!);

        if (pickupEnd <= pickupStart) {
            throw new BadRequestException(DEFAULT_MESSAGES.OFFER.INVALID_PICKUP_WINDOW);
        }

        const fileUpdates = await this.buildOfferFileUpdates(files);
        const { oldUrlsToDelete: _unusedOldUrls, ...uploadedFileFields } = fileUpdates;

        const offer = this.offersRepository.create({
            ...createOfferDto,
            ...uploadedFileFields,
            currency_code: business.currency_code,
            pickup_start: pickupStart,
            pickup_end: pickupEnd,
            created_by_staff_id: currentUser?.id,
            quantity_remaining: createOfferDto.quantity_total,
            slug: this.generateSlug(createOfferDto.title),
            status: OfferStatus.PUBLISHED,
        });

        const created = await this.offersRepository.save(offer);

        if (hasPickupWindows) {
            await this.offerPickupWindowsRepository.save(
                parsedPickupWindows.map((w) =>
                    this.offerPickupWindowsRepository.create({
                        offer_id: created.id,
                        starts_at: w.starts_at,
                        ends_at: w.ends_at,
                        max_pickups_per_window: w.max_pickups_per_window,
                    }),
                ),
            );
        }

        const withBusiness = await this.offersRepository.findOne({
            where: { id: created.id },
            relations: ['business', 'created_by_staff', 'updater', 'archiver', 'pickup_windows'],
        });
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

    async findAllForApp(paginationDto: PaginationDto, queryParams?: any): Promise<ApiResponseDto<any[]>> {
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

        const mapped = entities.map(offer => {
            const rawRow = raw.find((r) => r.offer_id === offer.id);
            return {
                id: offer.id,
                title: offer.title,
                slug: offer.slug,
                short_description: offer.short_description,
                main_image_url: offer.main_image_url,
                currency_code: offer.currency_code,
                original_price_minor: offer.original_price_minor,
                offer_price_minor: offer.offer_price_minor,
                discount_percentage: offer.discount_percentage,
                quantity_remaining: offer.quantity_remaining,
                is_featured: offer.is_featured,
                is_limited_time: offer.is_limited_time,
                average_rating: offer.average_rating,
                total_reviews: offer.total_reviews,
                pickup_start: offer.pickup_start,
                pickup_end: offer.pickup_end,
                business_name: offer.business?.display_name,
                category_name: offer.category?.name,
                distance_km: rawRow && rawRow.distance_meters != null ? parseFloat((parseFloat(rawRow.distance_meters) / 1000).toFixed(2)) : 0,
            };
        });

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.OFFER.LIST_FETCHED,
            mapped,
            { total, page, lastPage: Math.ceil(total / limit), limit },
        );
    }

    async findOneForApp(id: string, queryParams?: { lat?: number, lng?: number }): Promise<ApiResponseDto<any>> {
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
        
        const offer = entities[0];
        const rawRow = raw[0];

        const mapped = {
            id: offer.id,
            title: offer.title,
            slug: offer.slug,
            description: offer.description,
            short_description: offer.short_description,
            main_image_url: offer.main_image_url,
            gallery_images: offer.gallery_images,
            tags: offer.tags,
            dietary_info: offer.dietary_info,
            allergen_info: offer.allergen_info,
            currency_code: offer.currency_code,
            original_price_minor: offer.original_price_minor,
            offer_price_minor: offer.offer_price_minor,
            discount_percentage: offer.discount_percentage,
            quantity_remaining: offer.quantity_remaining,
            max_per_user: offer.max_per_user,
            is_featured: offer.is_featured,
            is_limited_time: offer.is_limited_time,
            average_rating: offer.average_rating,
            total_reviews: offer.total_reviews,
            pickup_start: offer.pickup_start,
            pickup_end: offer.pickup_end,
            pickup_windows: offer.pickup_windows?.map(w => ({
                id: w.id,
                starts_at: w.starts_at,
                ends_at: w.ends_at,
                max_pickups_per_window: w.max_pickups_per_window,
            })) || [],
            pickup_instructions: offer.pickup_instructions,
            advance_notice_hours: offer.advance_notice_hours,
            business_name: offer.business?.display_name,
            category_name: offer.category?.name,
            distance_km: rawRow && rawRow.distance_meters != null ? parseFloat((parseFloat(rawRow.distance_meters) / 1000).toFixed(2)) : 0,
        };

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.OFFER.FETCHED,
            mapped,
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
    ): Promise<ApiResponseDto<OfferResponseDto>> {
        const offer = await this.offersRepository.findOne({
            where: { id, is_archived: false },
            relations: ['business', 'pickup_windows'],
        });
        if (!offer) throw new NotFoundException(`${DEFAULT_MESSAGES.OFFER.NOT_FOUND}: ${id}`);

        const fileUpdates = await this.buildOfferFileUpdates(files, offer);
        const { oldUrlsToDelete, ...uploadedFileFields } = fileUpdates;

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

        const parsedPickupWindows = updateOfferDto.pickup_windows !== undefined
            ? this.parsePickupWindows(updateOfferDto.pickup_windows)
            : undefined;

        if (parsedPickupWindows !== undefined) {
            if (parsedPickupWindows.length > 0) {
                updatePayload.pickup_start = parsedPickupWindows.reduce(
                    (min, w) => (w.starts_at < min ? w.starts_at : min),
                    parsedPickupWindows[0].starts_at,
                );
                updatePayload.pickup_end = parsedPickupWindows.reduce(
                    (max, w) => (w.ends_at > max ? w.ends_at : max),
                    parsedPickupWindows[0].ends_at,
                );
            }
        } else {
            if (updateOfferDto.pickup_start) updatePayload.pickup_start = new Date(updateOfferDto.pickup_start);
            if (updateOfferDto.pickup_end) updatePayload.pickup_end = new Date(updateOfferDto.pickup_end);
        }

        const start = updatePayload.pickup_start || offer.pickup_start;
        const end = updatePayload.pickup_end || offer.pickup_end;
        if (end <= start) throw new BadRequestException(DEFAULT_MESSAGES.OFFER.INVALID_PICKUP_WINDOW);

        Object.assign(updatePayload, uploadedFileFields);
        updatePayload.updated_by = currentUser?.id;

        await this.offersRepository.update(id, updatePayload);

        if (parsedPickupWindows !== undefined) {
            await this.offerPickupWindowsRepository.delete({ offer_id: id });
            if (parsedPickupWindows.length > 0) {
                await this.offerPickupWindowsRepository.save(
                    parsedPickupWindows.map((w) =>
                        this.offerPickupWindowsRepository.create({
                            offer_id: id,
                            starts_at: w.starts_at,
                            ends_at: w.ends_at,
                            max_pickups_per_window: w.max_pickups_per_window,
                        }),
                    ),
                );
            }
        }

        const updated = await this.offersRepository.findOne({
            where: { id, is_archived: false },
            relations: ['business', 'category', 'created_by_staff', 'updater', 'archiver', 'pickup_windows'],
        });
        if (!updated) throw new NotFoundException(`${DEFAULT_MESSAGES.OFFER.NOT_FOUND}: ${id}`);

        if (oldUrlsToDelete.length) {
            await this.s3UploadService.deleteManyByUrls(oldUrlsToDelete);
        }

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.OFFER.UPDATED,
            OfferResponseDto.fromEntity(updated),
        );
    }

    async remove(id: string, currentUser: any): Promise<ApiResponseDto<{ id: string }>> {
        const offer = await this.offersRepository.findOne({ where: { id, is_archived: false } });
        if (!offer) throw new NotFoundException(`${DEFAULT_MESSAGES.OFFER.NOT_FOUND}: ${id}`);

        offer.is_archived = true;
        offer.archived_by = currentUser?.id;
        offer.archived_at = new Date();
        offer.is_active = false;
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
