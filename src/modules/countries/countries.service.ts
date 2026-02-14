import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Country } from './entities/country.entity';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { CountryResponseDto } from './dto/country-response.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { DEFAULT_MESSAGES } from '../../common/constants/default-messages';

@Injectable()
export class CountriesService {
    constructor(
        @InjectRepository(Country)
        private countriesRepository: Repository<Country>,
    ) { }

    async findAll(): Promise<ApiResponseDto<CountryResponseDto[]>> {
        const countries = await this.countriesRepository.find({ where: { is_active: true } });
        return ApiResponseDto.success(
          DEFAULT_MESSAGES.COUNTRY.LIST_FETCHED,
          countries.map((country) => CountryResponseDto.fromEntity(country)),
        );
    }

    async findOne(code: string): Promise<ApiResponseDto<CountryResponseDto>> {
        const normalizedCode = code.toUpperCase();
        const country = await this.countriesRepository.findOne({ where: { iso_code_3166: normalizedCode } });

        if (!country) {
          throw new NotFoundException(`${DEFAULT_MESSAGES.COUNTRY.NOT_FOUND}: ${normalizedCode}`);
        }

        return ApiResponseDto.success(
          DEFAULT_MESSAGES.COUNTRY.FETCHED,
          CountryResponseDto.fromEntity(country),
        );
    }

    async create(createCountryDto: CreateCountryDto): Promise<ApiResponseDto<CountryResponseDto>> {
        const isoCode = createCountryDto.iso_code_3166.toUpperCase();
        const iso3Code = createCountryDto.iso_code_3166_3.toUpperCase();

        const existing = await this.countriesRepository.findOne({ where: [{ iso_code_3166: isoCode }, { iso_code_3166_3: iso3Code }] });
        if (existing) {
            throw new ConflictException(DEFAULT_MESSAGES.COUNTRY.ALREADY_EXISTS);
        }

        const country = this.countriesRepository.create({
          ...createCountryDto,
          iso_code_3166: isoCode,
          iso_code_3166_3: iso3Code,
          currency_code: createCountryDto.currency_code.toUpperCase(),
        });

        const created = await this.countriesRepository.save(country);

        return ApiResponseDto.success(
          DEFAULT_MESSAGES.COUNTRY.CREATED,
          CountryResponseDto.fromEntity(created),
        );
    }

    async update(code: string, updateCountryDto: UpdateCountryDto): Promise<ApiResponseDto<CountryResponseDto>> {
        const normalizedCode = code.toUpperCase();

        const existing = await this.countriesRepository.findOne({ where: { iso_code_3166: normalizedCode } });
        if (!existing) {
          throw new NotFoundException(`${DEFAULT_MESSAGES.COUNTRY.NOT_FOUND}: ${normalizedCode}`);
        }

        const payload: UpdateCountryDto = {
          ...updateCountryDto,
          iso_code_3166_3: updateCountryDto.iso_code_3166_3?.toUpperCase(),
          currency_code: updateCountryDto.currency_code?.toUpperCase(),
        };

        await this.countriesRepository.update({ iso_code_3166: normalizedCode }, payload);

        const updated = await this.countriesRepository.findOne({ where: { iso_code_3166: normalizedCode } });
        if (!updated) {
          throw new NotFoundException(`${DEFAULT_MESSAGES.COUNTRY.NOT_FOUND}: ${normalizedCode}`);
        }

        return ApiResponseDto.success(
          DEFAULT_MESSAGES.COUNTRY.UPDATED,
          CountryResponseDto.fromEntity(updated),
        );
    }

    async remove(code: string): Promise<ApiResponseDto<{ iso_code_3166: string }>> {
        const normalizedCode = code.toUpperCase();

        const existing = await this.countriesRepository.findOne({ where: { iso_code_3166: normalizedCode } });
        if (!existing) {
          throw new NotFoundException(`${DEFAULT_MESSAGES.COUNTRY.NOT_FOUND}: ${normalizedCode}`);
        }

        await this.countriesRepository.delete({ iso_code_3166: normalizedCode });

        return ApiResponseDto.success(
          DEFAULT_MESSAGES.COUNTRY.DELETED,
          { iso_code_3166: normalizedCode },
        );
    }
}
