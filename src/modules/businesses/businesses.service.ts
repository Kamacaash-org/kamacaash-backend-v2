import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Business } from './entities/business.entity';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { BusinessResponseDto } from './dto/business-response.dto';
import { Country } from '../countries/entities/country.entity';
import { DEFAULT_MESSAGES } from '../../common/constants/default-messages';
import { StaffUser } from '../staff/entities/staff-user.entity';
import { BusinessOpeningHours } from './entities/business-opening-hours.entity';
import { BusinessBankAccount } from './entities/business-bank-account.entity';
import { DataSource } from 'typeorm';
import { S3UploadService } from '../../common/services/s3-upload.service';
import { UploadedFile } from '../../common/types/uploaded-file.type';
import { BusinessStatus, BusinessVerificationStatus, OfferStatus } from '../../common/entities/enums/all.enums';
import { BusinessVerificationListDto } from './dto/business-verification.dto';
import { Offer } from '../offers/entities/offer.entity';
import { AppBusinessQueryDto } from './app/dto/app-business-query.dto';
import {
    AppBusinessDetailDto,
    AppBusinessSummaryDto,
} from './app/dto/app-business-response.dto';
import { APP_BUSINESS_ACTIVE_OFFERS_LIMIT } from '../../config/businesses.config';

type BusinessUploadFiles = {
    logo_url?: UploadedFile[];
    banner_url?: UploadedFile[];
    license_document_url?: UploadedFile[];
    gallery_images?: UploadedFile[];
};
@Injectable()
export class BusinessesService {
    constructor(
        @InjectRepository(Business)
        private businessesRepository: Repository<Business>,
        @InjectRepository(Country)
        private countriesRepository: Repository<Country>,
        @InjectRepository(StaffUser)
        private staffRepository: Repository<StaffUser>,
        @InjectRepository(Offer)
        private offersRepository: Repository<Offer>,
        private dataSource: DataSource,
        private readonly s3UploadService: S3UploadService,
        private readonly configService: ConfigService,
    ) { }

    private async getCountryOrThrow(countryCode: string): Promise<Country> {
        const code = countryCode.toUpperCase();
        const country = await this.countriesRepository.findOne({ where: { iso_code_3166: code } });
        if (!country) throw new NotFoundException(`${DEFAULT_MESSAGES.COUNTRY.NOT_FOUND}: ${code}`);
        return country;
    }

    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');
    }

    async create(
        createBusinessDto: CreateBusinessDto,
        currentUser: any,
        files?: BusinessUploadFiles,
    ): Promise<ApiResponseDto<BusinessResponseDto>> {

        return await this.dataSource.transaction(async (manager) => {
            const fileUpdates = await this.buildBusinessFileUpdates(files);
            const { oldUrlsToDelete: _unusedOldUrls, ...uploadedFileFields } = fileUpdates;
            const mergedDto = { ...createBusinessDto, ...uploadedFileFields };
            const verificationStatus = uploadedFileFields.license_document_url
                ? BusinessVerificationStatus.PENDING
                : BusinessVerificationStatus.UNVERIFIED;

            const verification_submitted_at = uploadedFileFields.license_document_url
                ? new Date()
                : undefined;
            const {
                latitude,
                longitude,
                opening_hours,
                bank_account,
                ...rest
            } = mergedDto;

            const country = await this.getCountryOrThrow(currentUser.country_code);

            const business = manager.create(Business, {
                ...rest,
                verification_status: verificationStatus,
                verification_submitted_at,
                country_code: country.iso_code_3166,
                currency_code: country.currency_code,
                timezone: country.default_timezone,
                default_language: country.default_language,
                created_by: currentUser.id,
                location: {
                    type: 'Point',
                    coordinates: [longitude, latitude],
                },
                slug: this.generateSlug(rest.display_name),
            });

            const created = await manager.save(business);

            /*
            ─────────────────────────────
            CREATE OPENING HOURS
            ─────────────────────────────
            */

            if (opening_hours?.length) {
                const hoursEntities = opening_hours.map((h) =>
                    manager.create(BusinessOpeningHours, {
                        business_id: created.id,
                        day_of_week: h.day_of_week,
                        opens_at: h.opens_at,
                        closes_at: h.closes_at,
                    }),
                );

                await manager.save(hoursEntities);
            }

            /*
            ─────────────────────────────
            CREATE BANK ACCOUNT
            ─────────────────────────────
            */

            if (bank_account) {
                const bank = manager.create(BusinessBankAccount, {
                    ...bank_account,
                    business_id: created.id,
                });

                await manager.save(bank);
            }

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

        const query = this.businessesRepository.createQueryBuilder('business')
            .leftJoinAndSelect('business.bank_account', 'bank_account')
            .leftJoinAndSelect('business.opening_hours', 'opening_hours')
            .where('business.is_archived = :isArchived', { isArchived: false });

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
        const business = await this.businessesRepository.findOne({ where: { id, is_archived: false }, relations: ['bank_account', 'opening_hours'] });
        if (!business) throw new NotFoundException(`${DEFAULT_MESSAGES.BUSINESS.NOT_FOUND}: ${id}`);

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.BUSINESS.FETCHED,
            BusinessResponseDto.fromEntity(business),
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
            .andWhere('business.is_active = :isActive', { isActive: true })
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
            .where('business.is_archived = :isArchived', { isArchived: false })
            .andWhere('business.is_active = :isActive', { isActive: true })
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
            .leftJoinAndSelect('business.opening_hours', 'opening_hours')
            .where('business.id = :id', { id })
            .andWhere('business.is_archived = :isArchived', { isArchived: false })
            .andWhere('business.is_active = :isActive', { isActive: true })
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
            .where('offer.business_id = :businessId', { businessId: business.id })
            .andWhere('offer.is_archived = :isArchived', { isArchived: false })
            .andWhere('offer.is_active = :isActive', { isActive: true })
            .andWhere('offer.status = :status', { status: OfferStatus.PUBLISHED })
            .andWhere('offer.quantity_remaining > 0')
            .andWhere('offer.pickup_end >= :now', { now: new Date() })
            .orderBy('offer.is_featured', 'DESC')
            .addOrderBy('offer.pickup_start', 'ASC')
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
        files?: BusinessUploadFiles,
    ): Promise<ApiResponseDto<BusinessResponseDto>> {
        return await this.dataSource.transaction(async (manager) => {
            const businessRepo = manager.getRepository(Business);
            const staffRepo = manager.getRepository(StaffUser);
            const bankRepo = manager.getRepository(BusinessBankAccount);
            const hoursRepo = manager.getRepository(BusinessOpeningHours);

            const business = await businessRepo.findOne({
                where: {
                    id,
                    country_code: currentUser.country_code,
                    is_archived: false,
                },
                relations: ['bank_account', 'opening_hours'],
            });

            if (!business)
                throw new NotFoundException(
                    `${DEFAULT_MESSAGES.BUSINESS.NOT_FOUND}: ${id}`,
                );

            const fileUpdates = await this.buildBusinessFileUpdates(files, business);
            const { oldUrlsToDelete, ...uploadedFileFields } = fileUpdates;
            const mergedDto = { ...updateBusinessDto, ...uploadedFileFields };
            // If license uploaded -> move to pending verification
            const newLicenseUrl = uploadedFileFields.license_document_url;

            if ((newLicenseUrl && newLicenseUrl !== business.license_document_url) || (business.license_document_url && business
                .verification_status === BusinessVerificationStatus.UNVERIFIED)) {
                business.verification_status = BusinessVerificationStatus.PENDING;
                business.verification_submitted_at = new Date();
            }
            const {
                latitude,
                longitude,
                primary_staff_id,
                bank_account,
                opening_hours,
                ...rest
            } = mergedDto;
            console.log('business:', business);
            const updateData: Partial<Business> = {
                ...rest,
                updated_by: currentUser.id,
                updated_at: new Date(),
            };

            //  Location update
            if (latitude !== undefined && longitude !== undefined) {
                updateData.location = {
                    type: 'Point',
                    coordinates: [longitude, latitude],
                };
            }

            // Country info always from token
            const country = await this.getCountryOrThrow(currentUser.country_code);

            updateData.country_code = country.iso_code_3166;
            updateData.currency_code = country.currency_code;
            updateData.timezone = country.default_timezone;
            updateData.default_language = country.default_language;

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

            // Replace Opening Hours (RELATIONAL WAY)
            if (opening_hours) {
                business.opening_hours = opening_hours.map((hour) =>
                    hoursRepo.create({
                        ...hour,
                        business,
                    }),
                );
            }

            // Update / Create Bank Account (relational way)
            if (bank_account) {
                if (business.bank_account) {
                    Object.assign(business.bank_account, bank_account);
                } else {
                    business.bank_account = bankRepo.create(bank_account);
                }
            }

            // Save everything (cascade handles relations)
            await businessRepo.save(business);

            const updated = await businessRepo.findOne({
                where: { id },
                relations: ['bank_account', 'opening_hours'],
            });

            if (!updated)
                throw new NotFoundException(
                    `${DEFAULT_MESSAGES.BUSINESS.NOT_FOUND}: ${id}`,
                );

            if (oldUrlsToDelete.length) {
                await this.s3UploadService.deleteManyByUrls(oldUrlsToDelete);
            }

            return ApiResponseDto.success(
                DEFAULT_MESSAGES.BUSINESS.UPDATED,
                BusinessResponseDto.fromEntity(updated),
            );
        });
    }

    private async buildBusinessFileUpdates(
        files?: BusinessUploadFiles,
        existingBusiness?: Business,
    ): Promise<{
        logo_url?: string;
        banner_url?: string;
        license_document_url?: string;
        gallery_images?: string[];
        oldUrlsToDelete: string[];
    }> {
        const oldUrlsToDelete: string[] = [];
        const updates: {
            logo_url?: string;
            banner_url?: string;
            license_document_url?: string;
            gallery_images?: string[];
            oldUrlsToDelete: string[];
        } = { oldUrlsToDelete };

        const logo = files?.logo_url?.[0];
        if (logo) {
            updates.logo_url = await this.s3UploadService.uploadFile(logo, 'businesses/logos');
            if (existingBusiness?.logo_url) oldUrlsToDelete.push(existingBusiness.logo_url);
        }

        const banner = files?.banner_url?.[0];
        if (banner) {
            updates.banner_url = await this.s3UploadService.uploadFile(banner, 'businesses/banners');
            if (existingBusiness?.banner_url) oldUrlsToDelete.push(existingBusiness.banner_url);
        }

        const license = files?.license_document_url?.[0];
        if (license) {
            updates.license_document_url = await this.s3UploadService.uploadFile(
                license,
                'businesses/licenses',
            );
            if (existingBusiness?.license_document_url) {
                oldUrlsToDelete.push(existingBusiness.license_document_url);
            }
        }

        const gallery = files?.gallery_images ?? [];
        if (gallery.length) {
            updates.gallery_images = await this.s3UploadService.uploadFiles(
                gallery,
                'businesses/gallery',
            );
            if (existingBusiness?.gallery_images?.length) {
                oldUrlsToDelete.push(...existingBusiness.gallery_images);
            }
        }

        return updates;
    }

    async remove(id: string, currentUser: any): Promise<ApiResponseDto<{ id: string }>> {
        const business = await this.businessesRepository.findOne({
            where: {
                id,
                country_code: currentUser.country_code,
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
        dto: { is_active: boolean },
        currentUser: any,
    ): Promise<ApiResponseDto<BusinessResponseDto>> {

        const business = await this.businessesRepository.findOne({
            where: {
                id,
                country_code: currentUser.country_code,
                is_archived: false,
            },
        });

        if (!business) {
            throw new NotFoundException(
                `${DEFAULT_MESSAGES.BUSINESS.NOT_FOUND}: ${id}`,
            );
        }

        business.is_active = dto.is_active;
        business.updated_by = currentUser.id;
        business.updated_at = new Date();

        const updated = await this.businessesRepository.save(business);

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.BUSINESS.UPDATED,
            BusinessResponseDto.fromEntity(updated),
        );
    }


    async getBusinessesByVerificationStatus(
        status: BusinessVerificationStatus,
    ): Promise<ApiResponseDto<BusinessVerificationListDto[]>> {

        const businesses = await this.businessesRepository
            .createQueryBuilder('business')
            .leftJoinAndSelect('business.category', 'category')
            .leftJoinAndSelect('business.primary_staff', 'staff')
            .leftJoinAndSelect('business.verified_by_admin', 'verifier')
            .leftJoinAndSelect('business.rejecter', 'rejecter')
            .where('business.verification_status = :status', { status })
            .andWhere('business.is_archived = false')
            .select([
                'business.id',
                'business.display_name',
                'business.owner_name',
                'business.city',
                'business.phone_e164',
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
