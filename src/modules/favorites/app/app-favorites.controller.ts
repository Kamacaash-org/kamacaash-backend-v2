import { Body, Controller, Delete, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { ApiResponseDto } from '../../../common/dto/api-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FavoritesService } from '../favorites.service';
import { AddBusinessFavoriteDto } from './dto/add-business-favorite.dto';
import { AppFavoriteResponseDto } from './dto/app-favorite-response.dto';

@ApiTags('app/favorites')
@Controller('app/favorites')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AppFavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post('businesses/:businessId')
  @ApiOperation({ summary: 'Add business to favorites' })
  @ApiParam({ name: 'businessId', description: 'Business id' })
  @ApiOkResponse({ type: AppFavoriteResponseDto })
  addBusinessFavorite(
    @Param('businessId') businessId: string,
    @Body() dto: AddBusinessFavoriteDto,
    @Request() req,
  ): Promise<ApiResponseDto<AppFavoriteResponseDto>> {
    return this.favoritesService.addBusinessFavorite(req.user.id, businessId, dto);
  }

  @Delete('businesses/:businessId')
  @ApiOperation({ summary: 'Remove business from favorites' })
  @ApiParam({ name: 'businessId', description: 'Business id' })
  @ApiOkResponse({ type: AppFavoriteResponseDto })
  removeBusinessFavorite(
    @Param('businessId') businessId: string,
    @Request() req,
  ): Promise<ApiResponseDto<AppFavoriteResponseDto>> {
    return this.favoritesService.removeBusinessFavorite(req.user.id, businessId);
  }

  @Get('businesses')
  @ApiOperation({ summary: 'Get favorite businesses for current user' })
  @ApiOkResponse({ type: AppFavoriteResponseDto, isArray: true })
  getFavoriteBusinesses(
    @Request() req,
    @Query() paginationDto: PaginationDto,
  ): Promise<ApiResponseDto<AppFavoriteResponseDto[]>> {
    return this.favoritesService.getFavoriteBusinessesByUser(req.user.id, paginationDto);
  }
}
