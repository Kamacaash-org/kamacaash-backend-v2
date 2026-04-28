import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiResponseDto } from '../../../common/dto/api-response.dto';
import { BusinessesService } from '../businesses.service';
import { AppBusinessQueryDto } from './dto/app-business-query.dto';
import {
  AppBusinessDetailDto,
  AppBusinessSummaryDto,
} from './dto/app-business-response.dto';

@ApiTags('app/businesses')
@Controller('app/businesses')
export class AppBusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Get()
  @ApiOperation({ summary: 'List active businesses for app' })
  @ApiOkResponse({ type: AppBusinessSummaryDto, isArray: true })
  findActive(
    @Query() queryDto: AppBusinessQueryDto,
  ): Promise<ApiResponseDto<AppBusinessSummaryDto[]>> {
    return this.businessesService.findActiveForApp(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get active business details with active offers for app' })
  @ApiParam({ name: 'id', description: 'Business id' })
  @ApiOkResponse({ type: AppBusinessDetailDto })
  findOneActive(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() queryDto: AppBusinessQueryDto,
  ): Promise<ApiResponseDto<AppBusinessDetailDto>> {
    return this.businessesService.findOneActiveForApp(id, queryDto);
  }
}
