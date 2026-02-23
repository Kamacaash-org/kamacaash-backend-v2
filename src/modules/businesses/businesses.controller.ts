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
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { BusinessesService } from './businesses.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { BusinessResponseDto } from './dto/business-response.dto';
import { FindNearbyBusinessesDto } from './dto/find-nearby-businesses.dto';

type BusinessUploadFiles = {
    logo_url?: Express.Multer.File[];
    banner_url?: Express.Multer.File[];
    license_document_url?: Express.Multer.File[];
    gallery_images?: Express.Multer.File[];
};

@ApiTags('businesses')
@Controller('businesses')
export class BusinessesController {
    constructor(private readonly businessesService: BusinessesService) { }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'logo_url', maxCount: 1 },
            { name: 'banner_url', maxCount: 1 },
            { name: 'license_document_url', maxCount: 1 },
            { name: 'gallery_images', maxCount: 20 },
        ]),
    )
    @Post()
    @ApiOperation({ summary: 'Create business (Owner)' })
    create(
        @Body() createBusinessDto: CreateBusinessDto,
        @UploadedFiles() files: BusinessUploadFiles,
        @Request() req,
    ): Promise<ApiResponseDto<BusinessResponseDto>> {
        return this.businessesService.create(createBusinessDto, req.user, files);
    }

    @Get()
    @ApiOperation({ summary: 'List businesses' })
    findAll(@Query() paginationDto: PaginationDto): Promise<ApiResponseDto<BusinessResponseDto[]>> {
        return this.businessesService.findAll(paginationDto);
    }

    @Get('nearby')
    @ApiOperation({ summary: 'Find nearby businesses' })
    findNearby(@Query() queryDto: FindNearbyBusinessesDto): Promise<ApiResponseDto<BusinessResponseDto[]>> {
        return this.businessesService.findNearby(queryDto.lat, queryDto.lng, queryDto.radius ?? 10);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get business by ID' })
    findOne(@Param('id') id: string): Promise<ApiResponseDto<BusinessResponseDto>> {
        return this.businessesService.findOne(id);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'logo_url', maxCount: 1 },
            { name: 'banner_url', maxCount: 1 },
            { name: 'license_document_url', maxCount: 1 },
            { name: 'gallery_images', maxCount: 20 },
        ]),
    )
    @Put(':id')
    @ApiOperation({ summary: 'Update business' })
    update(
        @Param('id') id: string,
        @Body() updateBusinessDto: UpdateBusinessDto,
        @UploadedFiles() files: BusinessUploadFiles,
        @Request() req,
    ): Promise<ApiResponseDto<BusinessResponseDto>> {
        return this.businessesService.update(id, updateBusinessDto, req.user, files);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Delete(':id')
    @ApiOperation({ summary: 'Soft delete business' })
    remove(@Param('id') id: string, @Request() req): Promise<ApiResponseDto<{ id: string }>> {
        return this.businessesService.remove(id, req.user);
    }
}
