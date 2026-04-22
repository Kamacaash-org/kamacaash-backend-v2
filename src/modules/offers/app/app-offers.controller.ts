import { Controller, Get, Param, Query } from '@nestjs/common';
import { OffersService } from '../offers.service';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ApiResponseDto } from '../../../common/dto/api-response.dto';
import { AppOfferListResponseDto, OfferResponseDto } from './dto/offer-response.dto';

@ApiTags('app/offers')
@Controller('app/offers')
export class AppOffersController {
    constructor(private readonly offersService: OffersService) { }

    @Get()
    @ApiOperation({ summary: 'List offers' })
    @ApiQuery({ name: 'business_id', required: false })
    @ApiQuery({ name: 'category_id', required: false })
    @ApiQuery({ name: 'lat', required: false, type: Number })
    @ApiQuery({ name: 'lng', required: false, type: Number })
    findAll(
        @Query() paginationDto: PaginationDto,
        @Query('business_id') business_id?: string,
        @Query('category_id') category_id?: string,
        @Query('lat') lat?: string,
        @Query('lng') lng?: string,
    ): Promise<ApiResponseDto<AppOfferListResponseDto[]>> {
        return this.offersService.findAllForApp(paginationDto, { 
            business_id, 
            category_id,
            lat: lat ? parseFloat(lat) : undefined,
            lng: lng ? parseFloat(lng) : undefined
        });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get offer by ID' })
    @ApiQuery({ name: 'lat', required: false, type: Number })
    @ApiQuery({ name: 'lng', required: false, type: Number })
    findOne(
        @Param('id') id: string,
        @Query('lat') lat?: string,
        @Query('lng') lng?: string,
    ): Promise<ApiResponseDto<OfferResponseDto>> {
        return this.offersService.findOneForApp(id, {
            lat: lat ? parseFloat(lat) : undefined,
            lng: lng ? parseFloat(lng) : undefined
        });
    }
}
