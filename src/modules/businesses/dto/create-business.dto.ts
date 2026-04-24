import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { BusinessStatus } from 'src/common/entities/enums/all.enums';

class MerchantAccountDto {
  @ApiProperty({ example: 'Kamacaash Foods Ltd' })
  @IsString()
  @IsNotEmpty()
  merchantHolderName!: string;

  @ApiProperty({ example: '252612345678' })
  @IsString()
  @IsNotEmpty()
  merchantAccountNumber!: string;

  @ApiProperty({ example: 'WAAFI' })
  @IsString()
  @IsNotEmpty()
  merchantBankCode!: string;
}

export class CreateBusinessDto {
  private static parseJson(value: unknown): unknown {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (!trimmed) return value;
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  legal_name?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  display_name?: string;

  @ApiProperty()
  @IsUUID()
  category_id?: string;

  @ApiProperty()
  @IsUUID()
  primary_staff_id?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city_id?: string;


  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address_line?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  secondary_phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  website_url?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @Transform(({ value }) => CreateBusinessDto.parseJson(value))
  social_links?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  short_description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ enum: BusinessStatus })
  @IsOptional()
  @IsEnum(BusinessStatus)
  status?: BusinessStatus;


  @ApiPropertyOptional({ type: [MerchantAccountDto] })
  @IsOptional()
  @Transform(({ value }) => CreateBusinessDto.parseJson(value))
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MerchantAccountDto)
  merchant_accounts?: MerchantAccountDto[];

}
