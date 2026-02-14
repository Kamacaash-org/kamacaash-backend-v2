import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Country } from '../entities/country.entity';

export class CountryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  iso_code_3166: string;

  @ApiProperty()
  iso_code_3166_3: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  native_name?: string;

  @ApiProperty()
  phone_code: string;

  @ApiPropertyOptional()
  phone_number_length?: number;

  @ApiProperty()
  currency_code: string;

  @ApiProperty()
  currency_symbol: string;

  @ApiProperty()
  currency_name: string;

  @ApiProperty()
  default_timezone: string;

  @ApiProperty({ type: [String] })
  supported_timezones: string[];

  @ApiProperty()
  default_language: string;

  @ApiProperty({ type: [String] })
  supported_languages: string[];

  @ApiPropertyOptional()
  postal_code_format?: string;

  @ApiProperty()
  is_active: boolean;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;

  static fromEntity(country: Country): CountryResponseDto {
    return {
      id: country.id,
      iso_code_3166: country.iso_code_3166,
      iso_code_3166_3: country.iso_code_3166_3,
      name: country.name,
      native_name: country.native_name,
      phone_code: country.phone_code,
      phone_number_length: country.phone_number_length,
      currency_code: country.currency_code,
      currency_symbol: country.currency_symbol,
      currency_name: country.currency_name,
      default_timezone: country.default_timezone,
      supported_timezones: country.supported_timezones,
      default_language: country.default_language,
      supported_languages: country.supported_languages,
      postal_code_format: country.postal_code_format,
      is_active: country.is_active,
      created_at: country.created_at,
      updated_at: country.updated_at,
    };
  }
}
