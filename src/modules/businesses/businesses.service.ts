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

@Injectable()
export class BusinessesService {
    constructor(
        @InjectRepository(Business)
        private businessesRepository: Repository<Business>,
        @InjectRepository(Country)
        private countriesRepository: Repository<Country>,
        @InjectRepository(StaffUser)
        private staffRepository: Repository<StaffUser>,
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

    async create(createBusinessDto: CreateBusinessDto): Promise<ApiResponseDto<BusinessResponseDto>> {
        const { latitude, longitude, country_code, ...rest } = createBusinessDto;
        const country = await this.getCountryOrThrow(country_code);

        const business = this.businessesRepository.create({
            ...rest,
            country_code: country.iso_code_3166,
            currency_code: country.currency_code,
            timezone: country.default_timezone,
            default_language: country.default_language,
            location: {
                type: 'Point',
                coordinates: [longitude, latitude],
            },
            slug: this.generateSlug(rest.display_name),
        });

        const created = await this.businessesRepository.save(business);
        // Sync staff.business_id
        if (created.primary_staff_id) {
            await this.staffRepository.update(created.primary_staff_id, {
                business_id: created.id,
            });
        }

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.BUSINESS.CREATED,
            BusinessResponseDto.fromEntity(created),
        );
    }

    async findAll(paginationDto: PaginationDto): Promise<ApiResponseDto<BusinessResponseDto[]>> {
        const { page = 1, limit = 10, order = 'DESC', search } = paginationDto;
        const query = this.businessesRepository.createQueryBuilder('business');

        if (search) {
            query.where('business.display_name ILIKE :search OR business.description ILIKE :search', { search: `%${search}%` });
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
        const business = await this.businessesRepository.findOne({ where: { id } });
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

    async update(id: string, updateBusinessDto: UpdateBusinessDto): Promise<ApiResponseDto<BusinessResponseDto>> {
        const business = await this.businessesRepository.findOne({ where: { id } });
        if (!business) throw new NotFoundException(`${DEFAULT_MESSAGES.BUSINESS.NOT_FOUND}: ${id}`);

        const { latitude, longitude, country_code, ...rest } = updateBusinessDto;

        const oldPrimaryStaffId = business.primary_staff_id;
        const newPrimaryStaffId = updateBusinessDto.primary_staff_id;
        const updateData: Partial<Business> = { ...rest };

        if (latitude !== undefined && longitude !== undefined) {
            updateData.location = {
                type: 'Point',
                coordinates: [longitude, latitude],
            };
        }

        if (country_code) {
            const country = await this.getCountryOrThrow(country_code);
            updateData.country_code = country.iso_code_3166;
            updateData.currency_code = country.currency_code;
            updateData.timezone = country.default_timezone;
            updateData.default_language = country.default_language;
        }

        // If primary_staff_id changed, update references
        if (newPrimaryStaffId && newPrimaryStaffId !== oldPrimaryStaffId) {
            // Clear old staff.business_id
            if (oldPrimaryStaffId) {
                await this.staffRepository.update(oldPrimaryStaffId, {
                    business_id: "",
                });
            }

            // Assign new staff.business_id
            await this.staffRepository.update(newPrimaryStaffId, {
                business_id: business.id,
            });

            updateData.primary_staff_id = newPrimaryStaffId;
        }

        await this.businessesRepository.update(id, updateData);

        const updated = await this.businessesRepository.findOne({ where: { id } });
        if (!updated) throw new NotFoundException(`${DEFAULT_MESSAGES.BUSINESS.NOT_FOUND}: ${id}`);

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.BUSINESS.UPDATED,
            BusinessResponseDto.fromEntity(updated),
        );
    }

    async remove(id: string): Promise<ApiResponseDto<{ id: string }>> {
        const business = await this.businessesRepository.findOne({ where: { id } });
        if (!business) throw new NotFoundException(`${DEFAULT_MESSAGES.BUSINESS.NOT_FOUND}: ${id}`);

        await this.businessesRepository.softDelete(id);

        return ApiResponseDto.success(DEFAULT_MESSAGES.BUSINESS.DELETED, { id });
    }
}
