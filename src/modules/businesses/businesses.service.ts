import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
@Injectable()
export class BusinessesService {
    constructor(
        @InjectRepository(Business)
        private businessesRepository: Repository<Business>,
        @InjectRepository(Country)
        private countriesRepository: Repository<Country>,
        @InjectRepository(StaffUser)
        private staffRepository: Repository<StaffUser>,
        private dataSource: DataSource,
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
    ): Promise<ApiResponseDto<BusinessResponseDto>> {

        return await this.dataSource.transaction(async (manager) => {
            const {
                latitude,
                longitude,
                opening_hours,
                bank_account,
                ...rest
            } = createBusinessDto;

            const country = await this.getCountryOrThrow(currentUser.country_code);

            const business = manager.create(Business, {
                ...rest,
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
        const business = await this.businessesRepository.findOne({ where: { id, is_archived: false } });
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

    async update(
        id: string,
        updateBusinessDto: UpdateBusinessDto,
        currentUser: any,
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

            const {
                latitude,
                longitude,
                primary_staff_id,
                bank_account,
                opening_hours,
                ...rest
            } = updateBusinessDto;

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
}
