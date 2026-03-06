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
    UseInterceptors,
    UploadedFiles,
} from '@nestjs/common';
import { OffersService } from './offers.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { OfferResponseDto } from './dto/offer-response.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { UploadedFile } from '../../common/types/uploaded-file.type';

type OfferUploadFiles = {
    main_image_url?: UploadedFile[];
    gallery_images?: UploadedFile[];
};

@ApiTags('offers')
@Controller('offers')
export class OffersController {
    constructor(private readonly offersService: OffersService) { }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'main_image_url', maxCount: 1 },
            { name: 'gallery_images', maxCount: 20 },
        ]),
    )
    @Post()
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Create offer (Business/Staff)' })
    create(
        @Body() createOfferDto: CreateOfferDto,
        @UploadedFiles() files: OfferUploadFiles,
        @Request() req,
    ): Promise<ApiResponseDto<OfferResponseDto>> {
        return this.offersService.create(createOfferDto, req.user, files);
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
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'main_image_url', maxCount: 1 },
            { name: 'gallery_images', maxCount: 20 },
        ]),
    )
    @Put(':id')
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Update offer' })
    update(
        @Param('id') id: string,
        @Body() updateOfferDto: UpdateOfferDto,
        @UploadedFiles() files: OfferUploadFiles,
        @Request() req,
    ): Promise<ApiResponseDto<OfferResponseDto>> {
        return this.offersService.update(id, updateOfferDto, req.user, files);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Delete(':id')
    @ApiOperation({ summary: 'Soft delete offer' })
    remove(@Param('id') id: string, @Request() req): Promise<ApiResponseDto<{ id: string }>> {
        return this.offersService.remove(id, req.user);
    }
}
