import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateNested,
} from 'class-validator';

class CityLocationDto {
  @ApiProperty({ example: 2.0469 })
  @Type(() => Number)
  @IsNumber()
  latitude!: number;

  @ApiProperty({ example: 45.3182 })
  @Type(() => Number)
  @IsNumber()
  longitude!: number;
}

export class CreateCityDto {
  @ApiProperty({ example: 'Mogadishu' })
  @IsString()
  @Length(1, 100)
  name!: string;

  @ApiPropertyOptional({ example: 'Muqdisho' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  native_name?: string;

  @ApiProperty({ example: '7f8c3db2-2fca-4df4-9584-991783612345' })
  @IsUUID()
  country_id!: string;

  @ApiPropertyOptional({
    example: {
      latitude: -1.2921,
      longitude: 36.8219,
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CityLocationDto)
  location?: CityLocationDto;

  @ApiPropertyOptional({ example: 'Africa/Mogadishu' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  timezone?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
