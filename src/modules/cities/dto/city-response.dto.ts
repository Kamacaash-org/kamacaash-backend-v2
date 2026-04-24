import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { City } from '../entities/city.entity';

export class CityResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  native_name?: string;

  @ApiProperty()
  country_id!: string;

  country_name?: string;

  @ApiPropertyOptional()
  timezone?: string;

  location?: {
    latitude: number;
    longitude: number;
  };
  @ApiProperty()
  is_active!: boolean;

  @ApiProperty()
  created_at!: Date;

  @ApiProperty()
  updated_at!: Date;

  static fromEntity(city: City): CityResponseDto {
    return {
      id: city.id,
      name: city.name,
      native_name: city.native_name,
      country_id: city.country_id,
      country_name: city.country?.name,
      timezone: city.timezone,
      location: city.location,
      is_active: city.is_active,
      created_at: city.created_at,
      updated_at: city.updated_at,
    };
  }
}
