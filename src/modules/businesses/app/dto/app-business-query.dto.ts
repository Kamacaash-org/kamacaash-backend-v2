import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';
import { PaginationDto } from '../../../../common/dto/pagination.dto';

export class AppBusinessQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Current latitude for distance sorting.', example: 2.0469 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ description: 'Current longitude for distance sorting.', example: 45.3182 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional({ description: 'Optional radius filter in kilometers.', example: 10, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  radius_km?: number;
}
