import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class FindNearbyBusinessesDto {
  @ApiProperty({ type: Number })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ type: Number })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @ApiPropertyOptional({ type: Number, default: 10 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(200)
  radius?: number = 10;
}
