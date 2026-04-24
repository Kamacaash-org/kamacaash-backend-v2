import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponseDto } from '../../../common/dto/api-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CitiesService } from '../cities.service';
import { CityResponseDto } from '../dto/city-response.dto';
import { CreateCityDto } from '../dto/create-city.dto';
import { UpdateCityDto } from '../dto/update-city.dto';

@ApiTags('admin/cities')
@Controller('admin/cities')
export class AdminCitiesController {
  constructor(private readonly citiesService: CitiesService) { }

  @Get()
  @ApiOperation({ summary: 'List all active cities' })
  findAll(): Promise<ApiResponseDto<CityResponseDto[]>> {
    return this.citiesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get city by id' })
  findOne(@Param('id') id: string): Promise<ApiResponseDto<CityResponseDto>> {
    return this.citiesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Create city (Admin)' })
  create(
    @Body() createCityDto: CreateCityDto,
    @Request() req,
  ): Promise<ApiResponseDto<CityResponseDto>> {
    return this.citiesService.create(createCityDto, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put(':id')
  @ApiOperation({ summary: 'Update city (Admin)' })
  update(
    @Param('id') id: string,
    @Body() updateCityDto: UpdateCityDto,
    @Request() req,
  ): Promise<ApiResponseDto<CityResponseDto>> {
    return this.citiesService.update(id, updateCityDto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete city (Admin)' })
  remove(@Param('id') id: string): Promise<ApiResponseDto<{ id: string }>> {
    return this.citiesService.remove(id);
  }
}
