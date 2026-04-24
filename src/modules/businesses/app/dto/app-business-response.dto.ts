import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Business } from '../../entities/business.entity';
import { Offer } from '../../../offers/entities/offer.entity';

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


export class AppBusinessOfferDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  short_description?: string;

  @ApiPropertyOptional()
  main_image_url?: string;


  @ApiProperty()
  original_price_minor!: number;

  @ApiProperty()
  offer_price_minor!: number;

  @ApiProperty()
  discount_percentage!: number;

  @ApiProperty()
  quantity_remaining!: number;

  @ApiProperty()
  pickup_start!: Date;

  @ApiProperty()
  pickup_end!: Date;

  static fromEntity(offer: Offer): AppBusinessOfferDto {
    return {
      id: offer.id,
      title: offer.title,
      short_description: offer.short_description,
      main_image_url: offer.main_image_url,
      original_price_minor: offer.original_price_minor,
      offer_price_minor: offer.offer_price_minor,
      discount_percentage: offer.discount_percentage,
      quantity_remaining: offer.quantity_remaining,
      pickup_start: offer.pickup_start,
      pickup_end: offer.pickup_end,
    };
  }
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
        city: business.city.name,
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

  active_offers_list?: AppBusinessOfferDto[];
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
      active_offers_list: activeOffers.map((offer) => AppBusinessOfferDto.fromEntity(offer)),
    };
  }
}
