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
import { BusinessesService } from './businesses.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { BusinessResponseDto } from './dto/business-response.dto';
import { FindNearbyBusinessesDto } from './dto/find-nearby-businesses.dto';

@ApiTags('businesses')
@Controller('businesses')
export class BusinessesController {
    constructor(private readonly businessesService: BusinessesService) { }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Post()
    @ApiOperation({ summary: 'Create business (Owner)' })
    create(@Body() createBusinessDto: CreateBusinessDto, @Request() req): Promise<ApiResponseDto<BusinessResponseDto>> {
        return this.businessesService.create(createBusinessDto, req.user);
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
    @Put(':id')
    @ApiOperation({ summary: 'Update business' })
    update(@Param('id') id: string, @Body() updateBusinessDto: UpdateBusinessDto, @Request() req): Promise<ApiResponseDto<BusinessResponseDto>> {
        return this.businessesService.update(id, updateBusinessDto, req.user);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Delete(':id')
    @ApiOperation({ summary: 'Soft delete business' })
    remove(@Param('id') id: string, @Request() req): Promise<ApiResponseDto<{ id: string }>> {
        return this.businessesService.remove(id, req.user);
    }
}
