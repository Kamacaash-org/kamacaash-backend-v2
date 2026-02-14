import {
    Controller,
    Get,
    Post,
    Body,
    Put,
    Param,
    Delete,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { OffersService } from './offers.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { OfferResponseDto } from './dto/offer-response.dto';

@ApiTags('offers')
@Controller('offers')
export class OffersController {
    constructor(private readonly offersService: OffersService) { }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Post()
    @ApiOperation({ summary: 'Create offer (Business/Staff)' })
    create(@Body() createOfferDto: CreateOfferDto, @Request() req): Promise<ApiResponseDto<OfferResponseDto>> {
        return this.offersService.create(createOfferDto, req.user.id);
    }

    @Get()
    @ApiOperation({ summary: 'List offers' })
    @ApiQuery({ name: 'business_id', required: false })
    findAll(@Query() paginationDto: PaginationDto, @Query('business_id') business_id?: string): Promise<ApiResponseDto<OfferResponseDto[]>> {
        return this.offersService.findAll(paginationDto, { business_id });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get offer by ID' })
    findOne(@Param('id') id: string): Promise<ApiResponseDto<OfferResponseDto>> {
        return this.offersService.findOne(id);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Put(':id')
    @ApiOperation({ summary: 'Update offer' })
    update(@Param('id') id: string, @Body() updateOfferDto: UpdateOfferDto): Promise<ApiResponseDto<OfferResponseDto>> {
        return this.offersService.update(id, updateOfferDto);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Delete(':id')
    @ApiOperation({ summary: 'Soft delete offer' })
    remove(@Param('id') id: string): Promise<ApiResponseDto<{ id: string }>> {
        return this.offersService.remove(id);
    }
}
