import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Business } from '../../entities/business.entity';
import { Offer } from '../../../offers/entities/offer.entity';
import { AppOfferListResponseDto } from '../../../offers/app/dto/offer-response.dto';

class AppBusinessCategoryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  icon_url?: string;
}

class AppBusinessLocationDto {
  @ApiProperty()
  city?: string;


  @ApiPropertyOptional()
  address_line?: string;

  @ApiPropertyOptional()
  latitude?: number;

  @ApiPropertyOptional()
  longitude?: number;

  @ApiPropertyOptional()
  distance_km?: number;
}

export class AppBusinessSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  display_name!: string;

  @ApiPropertyOptional()
  logo_url?: string;

  @ApiPropertyOptional()
  short_description?: string;

  @ApiProperty({ type: AppBusinessCategoryDto })
  category!: AppBusinessCategoryDto;

  @ApiProperty({ type: AppBusinessLocationDto })
  location!: AppBusinessLocationDto;

  @ApiProperty()
  is_featured!: boolean;


  static fromEntity(business: Business, distanceKm?: number): AppBusinessSummaryDto {
    const coordinates = business.location?.coordinates;
    const lng = Array.isArray(coordinates) ? Number(coordinates[0]) : undefined;
    const lat = Array.isArray(coordinates) ? Number(coordinates[1]) : undefined;

    return {
      id: business.id,
      display_name: business.display_name,
      logo_url: business.logo_url,
      short_description: business.short_description,
      category: {
        id: business.category_id,
        name: business.category?.name,
        icon_url: business.category?.icon_url,
      },
      location: {
        city: business.city?.name,
        address_line: business.address_line,
        latitude: lat,
        longitude: lng,
        distance_km: distanceKm,
      },
      is_featured: business.is_featured,
    };
  }
}

export class AppBusinessDetailDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  display_name!: string;


  @ApiPropertyOptional()
  logo_url?: string;

  @ApiPropertyOptional()
  short_description?: string;

  @ApiProperty({ type: AppBusinessCategoryDto })
  category!: AppBusinessCategoryDto;

  @ApiProperty({ type: AppBusinessLocationDto })
  location!: AppBusinessLocationDto;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  banner_url?: string;

  @ApiProperty({ type: [String] })
  gallery_images?: string[];

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  website_url?: string;

  @ApiPropertyOptional({ type: [AppOfferListResponseDto] })
  published_offers?: AppOfferListResponseDto[];
  static fromEntity(
    business: Business,
    activeOffers: Offer[] = [],
    distanceKm?: number,
  ): AppBusinessDetailDto {
    return {
      ...AppBusinessSummaryDto.fromEntity(business, distanceKm),
      description: business.description,
      banner_url: business.banner_url,
      gallery_images: business.gallery_images,
      phone: business.phone,
      email: business.email,
      website_url: business.website_url,
      published_offers: activeOffers.map((offer) => AppOfferListResponseDto.fromEntity(offer)),
    };
  }
}
