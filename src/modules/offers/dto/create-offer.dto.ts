import {
    IsString,
    IsNotEmpty,
    IsUUID,
    IsArray,
    IsOptional,
    IsNumber,
    Min,
    IsDateString,
    MaxLength,
    ValidateNested,
    IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class OfferPickupWindowInputDto {
    @ApiProperty()
    @IsDateString()
    starts_at: string;

    @ApiProperty()
    @IsDateString()
    ends_at: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    @Min(1)
    max_pickups_per_window?: number;
}

export class CreateOfferDto {
    @ApiProperty()
    @IsUUID()
    business_id: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    category_id?: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    title: string;

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
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @ApiPropertyOptional()
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    dietary_info?: string[];

    @ApiPropertyOptional()
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    allergen_info?: string[];

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    main_image_url?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    gallery_images?: string[];

    @ApiPropertyOptional({ default: 'EUR', description: 'Ignored when business has enforced currency/country defaults' })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    currency_code?: string;

    @ApiProperty()
    @IsNumber()
    @Min(0)
    original_price_minor: number;

    @ApiProperty()
    @IsNumber()
    @Min(0)
    offer_price_minor: number;

    @ApiProperty()
    @IsNumber()
    @Min(1)
    quantity_total: number;

    @ApiProperty({ default: 1 })
    @IsNumber()
    @Min(1)
    max_per_user: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    pickup_start?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    pickup_end?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    pickup_instructions?: string;

    @ApiPropertyOptional({ type: [OfferPickupWindowInputDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OfferPickupWindowInputDto)
    pickup_windows?: OfferPickupWindowInputDto[];
}
