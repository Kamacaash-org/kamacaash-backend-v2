import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateCountryDto {
  @ApiProperty({ minLength: 2, maxLength: 2, example: 'US' })
  @IsString()
  @Length(2, 2)
  iso_code_3166: string;

  @ApiProperty({ minLength: 3, maxLength: 3, example: 'USA' })
  @IsString()
  @Length(3, 3)
  iso_code_3166_3: string;

  @ApiProperty({ example: 'United States' })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiPropertyOptional({ example: 'United States' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  native_name?: string;

  @ApiProperty({ example: '+1' })
  @IsString()
  @Length(1, 10)
  phone_code: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  phone_number_length?: number;

  @ApiProperty({ minLength: 3, maxLength: 3, example: 'USD' })
  @IsString()
  @Length(3, 3)
  currency_code: string;

  @ApiProperty({ example: '$' })
  @IsString()
  @Length(1, 10)
  currency_symbol: string;

  @ApiProperty({ example: 'US Dollar' })
  @IsString()
  @Length(1, 50)
  currency_name: string;

  @ApiProperty({ example: 'America/New_York' })
  @IsString()
  @Length(1, 50)
  default_timezone: string;

  @ApiProperty({ type: [String], example: ['America/New_York'] })
  @IsArray()
  @IsString({ each: true })
  supported_timezones: string[];

  @ApiProperty({ example: 'en' })
  @IsString()
  @Length(1, 10)
  default_language: string;

  @ApiProperty({ type: [String], example: ['en'] })
  @IsArray()
  @IsString({ each: true })
  supported_languages: string[];

  @ApiPropertyOptional({ example: '#####-####' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  postal_code_format?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
