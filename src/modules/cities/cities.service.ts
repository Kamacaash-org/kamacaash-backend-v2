import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { DEFAULT_MESSAGES } from '../../common/constants/default-messages';
import { Country } from '../countries/entities/country.entity';
import { CreateCityDto } from './dto/create-city.dto';
import { CityResponseDto } from './dto/city-response.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { City } from './entities/city.entity';

@Injectable()
export class CitiesService {
  constructor(
    @InjectRepository(City)
    private readonly citiesRepository: Repository<City>,
    @InjectRepository(Country)
    private readonly countriesRepository: Repository<Country>,
  ) { }

  async findAll(): Promise<ApiResponseDto<CityResponseDto[]>> {
    const cities = await this.citiesRepository.find({
      where: { is_active: true, is_archived: false },
      relations: ['country'],
      order: { name: 'ASC' },
    });

    return ApiResponseDto.success(
      DEFAULT_MESSAGES.CITY.LIST_FETCHED,
      cities.map((city) => CityResponseDto.fromEntity(city)),
    );
  }

  async findOne(id: string): Promise<ApiResponseDto<CityResponseDto>> {
    const city = await this.citiesRepository.findOne({
      where: { id },
      relations: ['country'],
    });

    if (!city) {
      throw new NotFoundException(`${DEFAULT_MESSAGES.CITY.NOT_FOUND}: ${id}`);
    }

    return ApiResponseDto.success(
      DEFAULT_MESSAGES.CITY.FETCHED,
      CityResponseDto.fromEntity(city),
    );
  }

  async create(
    createCityDto: CreateCityDto,
    createdBy: string,
  ): Promise<ApiResponseDto<CityResponseDto>> {
    const countryId = createCityDto.country_id;
    await this.ensureCountryExists(countryId);

    const existing = await this.citiesRepository.findOne({
      where: {
        country_id: countryId,
        name: createCityDto.name,
      },
    });

    if (existing) {
      throw new ConflictException(DEFAULT_MESSAGES.CITY.ALREADY_EXISTS);
    }

    const city = this.citiesRepository.create({
      ...createCityDto,
      country_id: countryId,
      created_by: createdBy,
    });

    const created = await this.citiesRepository.save(city);
    const createdWithCountry = await this.citiesRepository.findOne({
      where: { id: created.id },
      relations: ['country'],
    });

    if (!createdWithCountry) {
      throw new NotFoundException(`${DEFAULT_MESSAGES.CITY.NOT_FOUND}: ${created.id}`);
    }

    return ApiResponseDto.success(
      DEFAULT_MESSAGES.CITY.CREATED,
      CityResponseDto.fromEntity(createdWithCountry),
    );
  }

  async update(
    id: string,
    updateCityDto: UpdateCityDto,
    updatedBy?: string,
  ): Promise<ApiResponseDto<CityResponseDto>> {
    const existing = await this.citiesRepository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`${DEFAULT_MESSAGES.CITY.NOT_FOUND}: ${id}`);
    }

    const countryId = updateCityDto.country_id;
    if (countryId) {
      await this.ensureCountryExists(countryId);
    }

    const duplicateName = await this.citiesRepository.findOne({
      where: {
        country_id: countryId ?? existing.country_id,
        name: updateCityDto.name ?? existing.name,
      },
    });

    if (duplicateName && duplicateName.id !== id) {
      throw new ConflictException(DEFAULT_MESSAGES.CITY.ALREADY_EXISTS);
    }

    await this.citiesRepository.update(
      { id },
      {
        ...updateCityDto,
        ...(countryId ? { country_id: countryId } : {}),
        updated_by: updatedBy,
      },
    );

    const updated = await this.citiesRepository.findOne({
      where: { id },
      relations: ['country'],
    });
    if (!updated) {
      throw new NotFoundException(`${DEFAULT_MESSAGES.CITY.NOT_FOUND}: ${id}`);
    }

    return ApiResponseDto.success(
      DEFAULT_MESSAGES.CITY.UPDATED,
      CityResponseDto.fromEntity(updated),
    );
  }

  async remove(id: string): Promise<ApiResponseDto<{ id: string }>> {
    const existing = await this.citiesRepository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`${DEFAULT_MESSAGES.CITY.NOT_FOUND}: ${id}`);
    }

    await this.citiesRepository.update(
      { id },
      { is_archived: true, is_active: false },
    );

    return ApiResponseDto.success(DEFAULT_MESSAGES.CITY.DELETED, { id });
  }

  private async ensureCountryExists(countryId: string): Promise<void> {
    const country = await this.countriesRepository.findOne({
      where: { id: countryId },
    });

    if (!country) {
      throw new NotFoundException(
        `${DEFAULT_MESSAGES.COUNTRY.NOT_FOUND}: ${countryId}`,
      );
    }
  }
}
