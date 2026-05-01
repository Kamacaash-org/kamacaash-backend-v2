import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Business } from './entities/business.entity';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { BusinessResponseDto } from './dto/business-response.dto';
import { DEFAULT_MESSAGES } from '../../common/constants/default-messages';
import { StaffUser } from '../staff/entities/staff-user.entity';
import { DataSource } from 'typeorm';
import { BusinessStatus, BusinessVerificationStatus, OfferStatus, UserRole } from '../../common/entities/enums/all.enums';
import { BusinessVerificationListDto } from './dto/business-verification.dto';
import { Offer } from '../offers/entities/offer.entity';
import { AppBusinessQueryDto } from './app/dto/app-business-query.dto';
import {
    AppBusinessDetailDto,
    AppBusinessSummaryDto,
} from './app/dto/app-business-response.dto';
import { APP_BUSINESS_ACTIVE_OFFERS_LIMIT } from '../../config/businesses.config';
import { ToggleBusinessStatusDto } from './dto/toggle-business-status.dto';
import { BusinessProfileResponseDto } from './dto/business-profile-response.dto';
import { UpdateBusinessSettingsDto } from './dto/update-business-settings.dto';
import { S3UploadService } from '../../common/services/s3-upload.service';
import { UploadedFile } from '../../common/types/uploaded-file.type';

type BusinessSettingsUploadFiles = {
    logo_url?: UploadedFile[];
    banner_url?: UploadedFile[];
    gallery_images?: UploadedFile[];
};

@Injectable()
export class BusinessesService {
    constructor(
        @InjectRepository(Business)
        private businessesRepository: Repository<Business>,
        @InjectRepository(Offer)
        private offersRepository: Repository<Offer>,
        private dataSource: DataSource,
        private readonly configService: ConfigService,
        private readonly s3UploadService: S3UploadService,
    ) { }

    private normalizeMerchantAccounts(
        merchantAccounts?: CreateBusinessDto['merchant_accounts'],
    ): Business['merchant_accounts'] | undefined {
        if (!merchantAccounts) return undefined;

        return merchantAccounts.map((account) => ({
            merchantHolderName: account.merchantHolderName,
            merchantNumber: account.merchantAccountNumber,
            merchantProvider: account.merchantBankCode,
            isActive: true,
            isVerified: false,
        }));
    }

    private normalizeBusinessOpenHours(
        openHours?: Array<Record<string, unknown>>,
    ): Array<{ day_of_week: number; opens_at?: string; closes_at?: string }> | undefined {
        if (openHours === undefined) return undefined;
        if (!Array.isArray(openHours)) {
            throw new BadRequestException('open_hours must be an array');
        }

        return openHours.map((entry, index) => {
            if (!entry || typeof entry !== 'object') {
                throw new BadRequestException(`open_hours[${index}] must be an object`);
            }

            const day_of_week = Number(entry.day_of_week);
            if (!Number.isInteger(day_of_week) || day_of_week < 1 || day_of_week > 7) {
                throw new BadRequestException(`open_hours[${index}].day_of_week must be a number between 1 and 7`);
            }

            const opens_at =
                entry.opens_at === undefined || entry.opens_at === null || entry.opens_at === ''
                    ? undefined
                    : String(entry.opens_at);
            const closes_at =
                entry.closes_at === undefined || entry.closes_at === null || entry.closes_at === ''
                    ? undefined
                    : String(entry.closes_at);

            return {
                day_of_week,
                opens_at,
                closes_at,
            };
        });
    }


    async create(
        createBusinessDto: CreateBusinessDto,
        currentUser: any,
    ): Promise<ApiResponseDto<BusinessResponseDto>> {

        return await this.dataSource.transaction(async (manager) => {
            const {
                latitude,
                longitude,
                ...rest
            } = createBusinessDto;

            const business = manager.create(Business, {
                ...rest,
                verification_status: BusinessVerificationStatus.PENDING,
                created_by: currentUser.id,
                merchant_accounts: this.normalizeMerchantAccounts(createBusinessDto.merchant_accounts),
                location: {
                    type: 'Point',
                    coordinates: [longitude, latitude],
                }
            });

            const created = await manager.save(business);


            /*
            ─────────────────────────────
            SYNC PRIMARY STAFF
            ─────────────────────────────
            */

            if (created.primary_staff_id) {
                await manager.update(StaffUser, created.primary_staff_id, {
                    business_id: created.id,
                });
            }

            return ApiResponseDto.success(
                DEFAULT_MESSAGES.BUSINESS.CREATED,
                BusinessResponseDto.fromEntity(created),
            );
        });
    }

    async findAll(paginationDto: PaginationDto): Promise<ApiResponseDto<BusinessResponseDto[]>> {
        const { page = 1, limit = 10, order = 'DESC', search } = paginationDto;

        const query = this.businessesRepository
            .createQueryBuilder('business')
            .leftJoinAndSelect('business.category', 'category')
            .leftJoinAndSelect('business.city', 'city')
            .leftJoinAndSelect('business.primary_staff', 'staff')
            .where('business.is_archived = :isArchived', { isArchived: false });

        query.select([
            'business.id',
            'business.legal_name',
            'business.display_name',
            'business.category_id',
            'business.primary_staff_id',
            'business.city_id',
            'business.address_line',
            'business.location',
            'business.phone',
            'business.secondary_phone',
            'business.email',
            'business.website_url',
            'business.social_links',
            'business.logo_url',
            'business.banner_url',
            'business.gallery_images',
            'business.description',
            'business.short_description',
            'business.status',
            'business.is_archived',
            'business.is_featured',
            'business.featured_until',
            'business.notes',
            'business.created_at',
            'business.updated_at',
            'business.deleted_at',
            'business.merchant_accounts',
            'category.name',
            'city.name',
            'staff.first_name',
            'staff.last_name',
        ]);

        if (search) {
            query.andWhere('business.display_name ILIKE :search OR business.description ILIKE :search', { search: `%${search}%` });
        }

        query.orderBy('business.created_at', order);
        query.skip((page - 1) * limit);
        query.take(limit);

        const [data, total] = await query.getManyAndCount();

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.BUSINESS.LIST_FETCHED,
            data.map((business) => BusinessResponseDto.fromEntity(business)),
            { total, page, lastPage: Math.ceil(total / limit), limit },
        );
    }

    async findOne(id: string): Promise<ApiResponseDto<BusinessResponseDto>> {
        const business = await this.businessesRepository.findOne({ where: { id, is_archived: false } });
        if (!business) throw new NotFoundException(`${DEFAULT_MESSAGES.BUSINESS.NOT_FOUND}: ${id}`);

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.BUSINESS.FETCHED,
            BusinessResponseDto.fromEntity(business),
        );
    }

    async getBusinessProfile(id: string): Promise<ApiResponseDto<BusinessProfileResponseDto>> {
        const business = await this.businessesRepository
            .createQueryBuilder('business')
            .where('business.id = :id', { id })
            .andWhere('business.is_archived = :isArchived', { isArchived: false })
            .select([
                'business.id',
                'business.legal_name',
                'business.display_name',
                'business.logo_url',
                'business.banner_url',
                'business.gallery_images',
                'business.description',
                'business.short_description',
                'business.email',
                'business.phone',
                'business.secondary_phone',
                'business.website_url',
                'business.social_links',
                'business.metadata',
            ])
            .getOne();

        if (!business) throw new NotFoundException(`${DEFAULT_MESSAGES.BUSINESS.NOT_FOUND}: ${id}`);

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.BUSINESS.FETCHED,
            BusinessProfileResponseDto.fromEntity(business),
        );
    }

    async findNearby(lat: number, lng: number, radiusKm: number = 10): Promise<ApiResponseDto<BusinessResponseDto[]>> {
        const origin = {
            type: 'Point',
            coordinates: [lng, lat],
        };

        const businesses = await this.businessesRepository
            .createQueryBuilder('business')
            .where(
                `ST_DWithin(
          business.location::geography,
          ST_SetSRID(ST_GeomFromGeoJSON(:origin), 4326)::geography,
          :range
        )`,
                { origin: JSON.stringify(origin), range: radiusKm * 1000 },
            )
            .getMany();

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.BUSINESS.NEARBY_FETCHED,
            businesses.map((business) => BusinessResponseDto.fromEntity(business)),
        );
    }

    async findActiveForApp(
        queryDto: AppBusinessQueryDto,
    ): Promise<ApiResponseDto<AppBusinessSummaryDto[]>> {
        const { page = 1, limit = 10, order = 'DESC', search, lat, lng, radius_km } = queryDto;
        const hasCoordinates = lat !== undefined && lng !== undefined;
        const query = this.businessesRepository
            .createQueryBuilder('business')
            .leftJoinAndSelect('business.category', 'category')
            .leftJoinAndSelect('business.city', 'city')
            .where('business.is_archived = :isArchived', { isArchived: false })
            .andWhere('business.status = :status', { status: BusinessStatus.ACTIVE });

        if (search) {
            query.andWhere(
                '(business.display_name ILIKE :search OR business.short_description ILIKE :search OR category.name ILIKE :search)',
                { search: `%${search}%` },
            );
        }

        if (hasCoordinates) {
            this.addDistanceSelect(query, lat, lng);

            if (radius_km) {
                query.andWhere(
                    `ST_DWithin(
                        business.location::geography,
                        ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                        :radiusMeters
                    )`,
                    { radiusMeters: radius_km * 1000 },
                );
            }
        }

        if (hasCoordinates) {
            query.orderBy('distance_meters', 'ASC');
            query.addOrderBy('business.is_featured', 'DESC');
        } else {
            query.orderBy('business.is_featured', 'DESC');
            query.addOrderBy('business.created_at', order);
        }

        query.skip((page - 1) * limit);
        query.take(limit);

        const total = await query.getCount();
        const { entities, raw } = await query.getRawAndEntities();

        const data = entities.map((business) => {
            const rawRow = raw.find((row) => row.business_id === business.id);
            return AppBusinessSummaryDto.fromEntity(
                business,
                this.getDistanceKm(rawRow?.distance_meters),
            );
        });

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.BUSINESS.ACTIVE_LIST_FETCHED,
            data,
            { total, page, lastPage: Math.ceil(total / limit), limit },
        );
    }

    async findOneActiveForApp(
        id: string,
        queryDto: AppBusinessQueryDto,
    ): Promise<ApiResponseDto<AppBusinessDetailDto>> {
        const hasCoordinates = queryDto.lat !== undefined && queryDto.lng !== undefined;
        const query = this.businessesRepository
            .createQueryBuilder('business')
            .leftJoinAndSelect('business.category', 'category')
            .leftJoinAndSelect('business.city', 'city')
            .where('business.id = :id', { id })
            .andWhere('business.is_archived = :isArchived', { isArchived: false })
            .andWhere('business.status = :status', { status: BusinessStatus.ACTIVE });

        if (hasCoordinates) {
            this.addDistanceSelect(query, queryDto.lat!, queryDto.lng!);
        }

        const { entities, raw } = await query.getRawAndEntities();
        if (!entities.length) throw new NotFoundException(`${DEFAULT_MESSAGES.BUSINESS.NOT_FOUND}: ${id}`);

        const business = entities[0];
        const activeOffersLimit =
            this.configService.get<number>('businesses.appActiveOffersLimit') ??
            APP_BUSINESS_ACTIVE_OFFERS_LIMIT;
        const activeOffers = await this.offersRepository
            .createQueryBuilder('offer')
            .leftJoinAndSelect('offer.business', 'offer_business')
            .leftJoinAndSelect('offer_business.city', 'offer_city')
            .leftJoinAndSelect('offer_city.country', 'offer_country')
            .leftJoinAndSelect('offer.category', 'offer_category')
            .where('offer.business_id = :businessId', { businessId: business.id })
            .andWhere('offer.is_archived = :isArchived', { isArchived: false })
            .andWhere('offer.status = :status', { status: OfferStatus.PUBLISHED })
            .orderBy('offer.created_at', 'DESC')
            .take(activeOffersLimit)
            .getMany();

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.BUSINESS.ACTIVE_DETAILS_FETCHED,
            AppBusinessDetailDto.fromEntity(
                business,
                activeOffers,
                this.getDistanceKm(raw[0]?.distance_meters),
            ),
        );
    }

    private addDistanceSelect(query: SelectQueryBuilder<Business>, lat: number, lng: number): void {
        query.addSelect(
            `ST_Distance(
                business.location::geography,
                ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
            )`,
            'distance_meters',
        );
        query.setParameter('lat', lat);
        query.setParameter('lng', lng);
    }

    private getDistanceKm(distanceMeters?: string | number): number | undefined {
        if (distanceMeters === undefined || distanceMeters === null) return undefined;
        const distance = Number(distanceMeters);
        if (!Number.isFinite(distance)) return undefined;

        return Number((distance / 1000).toFixed(2));
    }

    async update(
        id: string,
        updateBusinessDto: UpdateBusinessDto,
        currentUser: any,
    ): Promise<ApiResponseDto<BusinessResponseDto>> {
        return await this.dataSource.transaction(async (manager) => {
            const businessRepo = manager.getRepository(Business);
            const staffRepo = manager.getRepository(StaffUser);

            const business = await businessRepo.findOne({
                where: {
                    id,
                    is_archived: false,
                }
            });

            if (!business)
                throw new NotFoundException(
                    `${DEFAULT_MESSAGES.BUSINESS.NOT_FOUND}: ${id}`,
                );

            const {
                latitude,
                longitude,
                primary_staff_id,
                merchant_accounts,
                ...rest
            } = updateBusinessDto;

            const updateData: Partial<Business> = {
                ...rest,
                updated_by: currentUser.id,
                updated_at: new Date(),
            };

            if (merchant_accounts !== undefined) {
                updateData.merchant_accounts = this.normalizeMerchantAccounts(merchant_accounts);
            }

            //  Location update
            if (latitude !== undefined && longitude !== undefined) {
                updateData.location = {
                    type: 'Point',
                    coordinates: [longitude, latitude],
                };
            }


            //  Primary staff change
            if (primary_staff_id && primary_staff_id !== business.primary_staff_id) {
                if (business.primary_staff_id) {
                    await staffRepo.update(business.primary_staff_id, {
                        business_id: null,
                    });
                }

                await staffRepo.update(primary_staff_id, {
                    business_id: business.id,
                });

                updateData.primary_staff_id = primary_staff_id;
            }

            // Apply primitive updates
            Object.assign(business, updateData);

            // Save everything (cascade handles relations)
            await businessRepo.save(business);

            const updated = await businessRepo.findOne({
                where: { id }
            });

            if (!updated)
                throw new NotFoundException(
                    `${DEFAULT_MESSAGES.BUSINESS.NOT_FOUND}: ${id}`,
                );

            return ApiResponseDto.success(
                DEFAULT_MESSAGES.BUSINESS.UPDATED,
                BusinessResponseDto.fromEntity(updated),
            );
        });
    }

    async remove(id: string, currentUser: any): Promise<ApiResponseDto<{ id: string }>> {
        const business = await this.businessesRepository.findOne({
            where: {
                id,
                is_archived: false,
            },
        });

        if (!business) {
            throw new NotFoundException(`${DEFAULT_MESSAGES.BUSINESS.NOT_FOUND}: ${id}`);
        }

        business.is_archived = true;
        business.archived_by = currentUser.id;
        business.archived_at = new Date();

        await this.businessesRepository.save(business);
        return ApiResponseDto.success(DEFAULT_MESSAGES.BUSINESS.DELETED, { id });
    }

    async toggleStatus(
        id: string,
        dto: ToggleBusinessStatusDto,
        currentUser: any,
    ): Promise<ApiResponseDto<BusinessResponseDto>> {

        const business = await this.businessesRepository.findOne({
            where: {
                id,
                is_archived: false,
            },
        });

        if (!business) {
            throw new NotFoundException(
                `${DEFAULT_MESSAGES.BUSINESS.NOT_FOUND}: ${id}`,
            );
        }

        business.status = dto.business_status;
        business.updated_by = currentUser.id;
        business.updated_at = new Date();

        const updated = await this.businessesRepository.save(business);

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.BUSINESS.UPDATED,
            BusinessResponseDto.fromEntity(updated),
        );
    }

    async updateBusinessSettings(
        id: string,
        dto: UpdateBusinessSettingsDto,
        currentUser: any,
        files?: BusinessSettingsUploadFiles,
    ): Promise<ApiResponseDto<BusinessProfileResponseDto>> {
        const business = await this.businessesRepository.findOne({
            where: {
                id,
                is_archived: false,
            },
        });

        if (!business) {
            throw new NotFoundException(`${DEFAULT_MESSAGES.BUSINESS.NOT_FOUND}: ${id}`);
        }

        const canManageAnyBusiness =
            currentUser?.role === UserRole.SUPER_ADMIN || currentUser?.role === UserRole.ADMIN;
        const belongsToBusiness = currentUser?.business_id === id;

        if (!canManageAnyBusiness && !belongsToBusiness) {
            throw new ForbiddenException('You are not allowed to update this business settings');
        }

        const oldUrlsToDelete: string[] = [];
        const logoFile = files?.logo_url?.[0];
        const bannerFile = files?.banner_url?.[0];
        const galleryFiles = files?.gallery_images;

        let nextLogoUrl = business.logo_url;
        let nextBannerUrl = business.banner_url;
        let nextGalleryImages = business.gallery_images;

        if (logoFile) {
            nextLogoUrl = await this.s3UploadService.uploadFile(logoFile, 'businesses/logos');
            if (business.logo_url) {
                oldUrlsToDelete.push(business.logo_url);
            }
        }

        if (bannerFile) {
            nextBannerUrl = await this.s3UploadService.uploadFile(bannerFile, 'businesses/banners');
            if (business.banner_url) {
                oldUrlsToDelete.push(business.banner_url);
            }
        }

        if (galleryFiles?.length) {
            nextGalleryImages = await this.s3UploadService.uploadFiles(galleryFiles, 'businesses/gallery');
            if (business.gallery_images?.length) {
                oldUrlsToDelete.push(...business.gallery_images);
            }
        }

        const normalizedOpenHours = this.normalizeBusinessOpenHours(dto.open_hours);

        Object.assign(business, {
            logo_url: nextLogoUrl,
            banner_url: nextBannerUrl,
            gallery_images: nextGalleryImages,
            description: dto.description ?? business.description,
            short_description: dto.short_description ?? business.short_description,
            display_name: dto.display_name ?? business.display_name,
            email: dto.email ?? business.email,
            phone: dto.phone ?? business.phone,
            secondary_phone: dto.secondary_phone ?? business.secondary_phone,
            website_url: dto.website_url ?? business.website_url,
            social_links: dto.social_links ?? business.social_links,
            metadata: normalizedOpenHours !== undefined
                ? {
                    ...(business.metadata ?? {}),
                    open_hours: normalizedOpenHours,
                }
                : business.metadata,
            updated_by: currentUser?.id ?? business.updated_by,
        });

        const updated = await this.businessesRepository.save(business);
        if (oldUrlsToDelete.length) {
            await this.s3UploadService.deleteManyByUrls(oldUrlsToDelete);
        }

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.BUSINESS.UPDATED,
            BusinessProfileResponseDto.fromEntity(updated),
        );
    }


    async getBusinessesByVerificationStatus(
        status: BusinessVerificationStatus,
    ): Promise<ApiResponseDto<BusinessVerificationListDto[]>> {

        const businesses = await this.businessesRepository
            .createQueryBuilder('business')
            .leftJoinAndSelect('business.category', 'category')
            .leftJoinAndSelect('business.city', 'city')
            .leftJoinAndSelect('business.primary_staff', 'staff')
            .leftJoinAndSelect('business.verified_by_admin', 'verifier')
            .leftJoinAndSelect('business.rejecter', 'rejecter')
            .where('business.verification_status = :status', { status })
            .andWhere('business.is_archived = false')
            .select([
                'business.id',
                'business.display_name',
                'city.name',
                'business.phone',
                'business.logo_url',
                'business.license_document_url',
                'business.verification_status',
                'business.verification_reviewed_at',
                'business.verification_rejection_reason',
                'business.verification_submitted_at',
                'business.created_at',
                'category.name',
                'staff.first_name',
                'staff.last_name',
                'staff.phone_e164',
                'verifier.first_name',
                'verifier.last_name',
                'rejecter.first_name',
                'rejecter.last_name',
            ])
            .orderBy('business.created_at', 'DESC')
            .getMany();

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.BUSINESS.LIST_FETCHED,
            businesses.map((b) => BusinessVerificationListDto.fromEntity(b)),
        );
    }


    async approveBusiness(businessId: string, adminId: string): Promise<ApiResponseDto<any>> {
        const business = await this.businessesRepository.findOne({
            where: { id: businessId, is_archived: false },
            relations: ['verified_by_admin'],
        });

        if (!business) throw new NotFoundException('Business not found');

        if (business.verification_status === BusinessVerificationStatus.VERIFIED) {
            throw new BadRequestException('Business is already approved');
        }

        business.verification_status = BusinessVerificationStatus.VERIFIED;
        business.verified_by_admin_id = adminId;
        business.verification_reviewed_at = new Date();

        await this.businessesRepository.save(business);

        return ApiResponseDto.success('Business approved successfully', {
            id: business.id,
            verification_status: business.verification_status,
            verification_reviewed_at: business.verification_reviewed_at,
        });
    }

    async rejectBusiness(businessId: string, adminId: string, reason: string): Promise<ApiResponseDto<any>> {
        const business = await this.businessesRepository.findOne({
            where: { id: businessId, is_archived: false },
            relations: ['rejecter'],
        });

        if (!business) throw new NotFoundException('Business not found');

        if (business.verification_status === BusinessVerificationStatus.REJECTED) {
            throw new BadRequestException('Business is already rejected');
        }

        business.verification_status = BusinessVerificationStatus.REJECTED;
        business.rejected_by_admin_id = adminId;
        business.verification_rejection_reason = reason;
        business.verification_reviewed_at = new Date();

        await this.businessesRepository.save(business);

        return ApiResponseDto.success('Business rejected successfully', {
            id: business.id,
            verification_status: business.verification_status,
            verification_rejection_reason: business.verification_rejection_reason,
            verification_reviewed_at: business.verification_reviewed_at,
        });
    }
}
