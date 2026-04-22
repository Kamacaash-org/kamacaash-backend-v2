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
    @Type(() => Number)
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

    @ApiPropertyOptional({ default: 'USD', description: 'Ignored when business has enforced currency/country defaults' })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    currency_code?: string;

    @ApiProperty({
        description: 'Original price in normal money units. Example: send 12.5 for $12.50; the API stores 1250.',
        example: 12.5,
    })
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    original_price_minor: number;

    @ApiProperty({
        description: 'Offer price in normal money units. Example: send 9.99 for $9.99; the API stores 999.',
        example: 9.99,
    })
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    offer_price_minor: number;

    @ApiProperty()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    quantity_total: number;

    @ApiProperty({ default: 1 })
    @Type(() => Number)
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
