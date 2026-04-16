import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Business } from '../../entities/business.entity';
import { Offer } from '../../../offers/entities/offer.entity';

class AppBusinessCategoryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  icon_url?: string;
}

class AppBusinessLocationDto {
  @ApiProperty()
  city: string;

  @ApiPropertyOptional()
  region?: string;

  @ApiPropertyOptional()
  district?: string;

  @ApiPropertyOptional()
  address_line1?: string;

  @ApiPropertyOptional()
  latitude?: number;

  @ApiPropertyOptional()
  longitude?: number;

  @ApiPropertyOptional()
  distance_km?: number;
}

class AppBusinessOpeningHourDto {
  @ApiProperty()
  day_of_week: number;

  @ApiPropertyOptional()
  opens_at?: string;

  @ApiPropertyOptional()
  closes_at?: string;

  @ApiPropertyOptional()
  is_closed?: boolean;
}

export class AppBusinessOfferDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  short_description?: string;

  @ApiPropertyOptional()
  main_image_url?: string;

  @ApiProperty()
  currency_code: string;

  @ApiProperty()
  original_price_minor: number;

  @ApiProperty()
  offer_price_minor: number;

  @ApiProperty()
  discount_percentage: number;

  @ApiProperty()
  quantity_remaining: number;

  @ApiProperty()
  pickup_start: Date;

  @ApiProperty()
  pickup_end: Date;

  static fromEntity(offer: Offer): AppBusinessOfferDto {
    return {
      id: offer.id,
      title: offer.title,
      slug: offer.slug,
      short_description: offer.short_description,
      main_image_url: offer.main_image_url,
      currency_code: offer.currency_code,
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
  id: string;

  @ApiProperty()
  display_name: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  logo_url?: string;

  @ApiPropertyOptional()
  short_description?: string;

  @ApiProperty({ type: AppBusinessCategoryDto })
  category: AppBusinessCategoryDto;

  @ApiProperty({ type: AppBusinessLocationDto })
  location: AppBusinessLocationDto;

  @ApiProperty()
  currency_code: string;

  @ApiProperty()
  timezone: string;

  @ApiProperty()
  is_featured: boolean;

  @ApiProperty()
  active_offers: number;

  @ApiProperty()
  average_rating: number;

  @ApiProperty()
  total_reviews: number;

  static fromEntity(business: Business, distanceKm?: number): AppBusinessSummaryDto {
    const coordinates = business.location?.coordinates;
    const lng = Array.isArray(coordinates) ? Number(coordinates[0]) : undefined;
    const lat = Array.isArray(coordinates) ? Number(coordinates[1]) : undefined;

    return {
      id: business.id,
      display_name: business.display_name,
      slug: business.slug,
      logo_url: business.logo_url,
      short_description: business.short_description,
      category: {
        id: business.category_id,
        name: business.category?.name,
        icon_url: business.category?.icon_url,
      },
      location: {
        city: business.city,
        region: business.region,
        district: business.district,
        address_line1: business.address_line1,
        latitude: lat,
        longitude: lng,
        distance_km: distanceKm,
      },
      currency_code: business.currency_code,
      timezone: business.timezone,
      is_featured: business.is_featured,
      active_offers: business.active_offers,
      average_rating: Number(business.average_rating),
      total_reviews: business.total_reviews,
    };
  }
}

export class AppBusinessDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  display_name: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  logo_url?: string;

  @ApiPropertyOptional()
  short_description?: string;

  @ApiProperty({ type: AppBusinessCategoryDto })
  category: AppBusinessCategoryDto;

  @ApiProperty({ type: AppBusinessLocationDto })
  location: AppBusinessLocationDto;

  @ApiProperty()
  currency_code: string;

  @ApiProperty()
  timezone: string;

  @ApiProperty()
  is_featured: boolean;

  @ApiProperty()
  active_offers: number;

  @ApiProperty()
  average_rating: number;

  @ApiProperty()
  total_reviews: number;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  banner_url?: string;

  @ApiProperty({ type: [String] })
  gallery_images: string[];

  @ApiPropertyOptional()
  phone_e164?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  website_url?: string;

  @ApiPropertyOptional({ type: [AppBusinessOpeningHourDto] })
  opening_hours?: AppBusinessOpeningHourDto[];

  @ApiProperty({ type: Object })
  business_hours: Record<string, any[]>;

  @ApiProperty({ type: [Object] })
  holiday_hours: any[];

  @ApiProperty({ type: [AppBusinessOfferDto] })
  active_offers_list: AppBusinessOfferDto[];

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
      phone_e164: business.phone_e164,
      email: business.email,
      website_url: business.website_url,
      opening_hours: business.opening_hours?.map((hour) => ({
        day_of_week: hour.day_of_week,
        opens_at: hour.opens_at,
        closes_at: hour.closes_at,
        is_closed: hour.is_closed,
      })),
      business_hours: business.business_hours,
      holiday_hours: business.holiday_hours,
      active_offers_list: activeOffers.map((offer) => AppBusinessOfferDto.fromEntity(offer)),
    };
  }
}
