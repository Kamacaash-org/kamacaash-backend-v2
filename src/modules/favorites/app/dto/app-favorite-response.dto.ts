import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FavoriteSource } from '../../../../common/entities/enums/all.enums';
import { Favorite } from '../../entities/favorite.entity';

class AppFavoriteBusinessDto {
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

  @ApiPropertyOptional()
  category_name?: string;

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

  @ApiProperty()
  currency_code: string;

  @ApiProperty()
  timezone: string;

  @ApiProperty()
  active_offers: number;

  @ApiProperty()
  average_rating: number;

  @ApiProperty()
  total_reviews: number;
}

export class AppFavoriteResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  user_id: string;

  @ApiProperty()
  business_id: string;

  @ApiProperty({ enum: FavoriteSource })
  source: FavoriteSource;

  @ApiPropertyOptional()
  note?: string;

  @ApiProperty()
  created_at: Date;

  @ApiPropertyOptional({ type: AppFavoriteBusinessDto })
  business?: AppFavoriteBusinessDto;

  static fromEntity(favorite: Favorite): AppFavoriteResponseDto {
    const coordinates = favorite.business?.location?.coordinates;
    const lng = Array.isArray(coordinates) ? Number(coordinates[0]) : undefined;
    const lat = Array.isArray(coordinates) ? Number(coordinates[1]) : undefined;

    return {
      id: favorite.id,
      user_id: favorite.user_id,
      business_id: favorite.business_id,
      source: favorite.source,
      note: favorite.note,
      created_at: favorite.created_at,
      business: favorite.business
        ? {
            id: favorite.business.id,
            display_name: favorite.business.display_name,
            slug: favorite.business.slug,
            logo_url: favorite.business.logo_url,
            short_description: favorite.business.short_description,
            category_name: favorite.business.category?.name,
            city: favorite.business.city,
            region: favorite.business.region,
            district: favorite.business.district,
            address_line1: favorite.business.address_line1,
            latitude: lat,
            longitude: lng,
            currency_code: favorite.business.currency_code,
            timezone: favorite.business.timezone,
            active_offers: favorite.business.active_offers,
            average_rating: Number(favorite.business.average_rating),
            total_reviews: favorite.business.total_reviews,
          }
        : undefined,
    };
  }
}
