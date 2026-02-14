import { Controller, Get, Post, Body, Put, Param, Delete } from '@nestjs/common';
import { CountriesService } from './countries.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { CountryResponseDto } from './dto/country-response.dto';

@ApiTags('countries')
@Controller('countries')
export class CountriesController {
    constructor(private readonly countriesService: CountriesService) { }

    @Get()
    @ApiOperation({ summary: 'List all active countries' })
    findAll(): Promise<ApiResponseDto<CountryResponseDto[]>> {
        return this.countriesService.findAll();
    }

    @Get(':code')
    @ApiOperation({ summary: 'Get country by ISO code' })
    findOne(@Param('code') code: string): Promise<ApiResponseDto<CountryResponseDto>> {
        return this.countriesService.findOne(code);
    }

    @Post()
    @ApiOperation({ summary: 'Create country (Admin)' })
    create(@Body() createCountryDto: CreateCountryDto): Promise<ApiResponseDto<CountryResponseDto>> {
        return this.countriesService.create(createCountryDto);
    }

    @Put(':code')
    @ApiOperation({ summary: 'Update country (Admin)' })
    update(
      @Param('code') code: string,
      @Body() updateCountryDto: UpdateCountryDto,
    ): Promise<ApiResponseDto<CountryResponseDto>> {
        return this.countriesService.update(code, updateCountryDto);
    }

    @Delete(':code')
    @ApiOperation({ summary: 'Delete country (Admin)' })
    remove(@Param('code') code: string): Promise<ApiResponseDto<{ iso_code_3166: string }>> {
        return this.countriesService.remove(code);
    }
}
