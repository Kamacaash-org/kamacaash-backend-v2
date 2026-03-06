import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { CountriesService } from './countries.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { CountryResponseDto } from './dto/country-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

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

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Post()
    @ApiOperation({ summary: 'Create country (Admin)' })
    create(@Body() createCountryDto: CreateCountryDto, @Request() req,): Promise<ApiResponseDto<CountryResponseDto>> {
        return this.countriesService.create(createCountryDto, req.user.id);
    }


    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Put(':id')
    @ApiOperation({ summary: 'Update country (Admin)' })
    update(
        @Param('id') id: string,
        @Body() updateCountryDto: UpdateCountryDto,
        @Request() req,
    ): Promise<ApiResponseDto<CountryResponseDto>> {
        return this.countriesService.update(id, updateCountryDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete country (Admin)' })
    remove(@Param('id') id: string): Promise<ApiResponseDto<{ iso_code_3166: string }>> {
        return this.countriesService.remove(id);
    }
}
