import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessStatus, BusinessVerificationStatus } from '../../../common/entities/enums/all.enums';
import { Business } from '../entities/business.entity';

export class BusinessResponseDto {
  @ApiProperty()
  id?: string;

  @ApiProperty()
  legal_name?: string;

  @ApiProperty()
  display_name?: string;


  @ApiProperty()
  category_id?: string;

  category_name?: string;

  city_name?: string;


  @ApiPropertyOptional()
  primary_staff_id?: string;


  @ApiPropertyOptional()
  primary_staff_name?: string;

  @ApiProperty()
  city_id?: string;

  @ApiPropertyOptional()
  address_line?: string;

  @ApiPropertyOptional()
  latitude?: number;

  @ApiPropertyOptional()
  longitude?: number;

  @ApiProperty()
  phone?: string;

  @ApiPropertyOptional()
  secondary_phone?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  website_url?: string;

  @ApiProperty({ type: Object })
  social_links?: Record<string, string>;

  @ApiPropertyOptional()
  logo_url?: string;

  @ApiPropertyOptional()
  banner_url?: string;

  @ApiProperty({ type: [String] })
  gallery_images?: string[];

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  short_description?: string;

  @ApiPropertyOptional()
  SQN?: string;

  @ApiProperty({ enum: BusinessStatus })
  status?: BusinessStatus;

  @ApiProperty()
  is_archived?: boolean;

  @ApiProperty()
  is_featured?: boolean;

  @ApiPropertyOptional()
  featured_until?: Date;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  created_at?: Date;

  @ApiProperty()
  updated_at?: Date;

  @ApiPropertyOptional()
  deleted_at?: Date;

  merchant_account?: {
    merchantHolderName: string;
    merchantNumber: string;
    merchantProvider: string;
    is_active: boolean;
    is_verified: boolean;
  }[];

  static fromEntity(business: Business): BusinessResponseDto {
    const coordinates = business.location?.coordinates;
    const lng = Array.isArray(coordinates) ? Number(coordinates[0]) : undefined;
    const lat = Array.isArray(coordinates) ? Number(coordinates[1]) : undefined;

    return {
      id: business.id,
      legal_name: business.legal_name,
      display_name: business.display_name,
      category_id: business.category_id,
      primary_staff_id: business.primary_staff_id,
      city_id: business.city_id,
      city_name: business.city?.name,
      category_name: business.category?.name,
      primary_staff_name: business.primary_staff ? `${business.primary_staff.first_name} ${business.primary_staff.last_name}` : undefined,
      address_line: business.address_line,
      latitude: lat,
      longitude: lng,
      phone: business.phone,
      secondary_phone: business.secondary_phone,
      email: business.email,
      website_url: business.website_url,
      social_links: business.social_links,
      logo_url: business.logo_url,
      banner_url: business.banner_url,
      gallery_images: business.gallery_images,
      description: business.description,
      short_description: business.short_description,
      status: business.status,
      is_archived: business.is_archived,
      is_featured: business.is_featured,
      featured_until: business.featured_until,
      notes: business.notes,
      created_at: business.created_at,
      updated_at: business.updated_at,
      deleted_at: business.deleted_at,
      merchant_account: business.merchant_accounts && business.merchant_accounts.length > 0
        ? business.merchant_accounts.map((account) => ({
          merchantHolderName: account.merchantHolderName,
          merchantNumber: account.merchantNumber,
          merchantProvider: account.merchantProvider,
          is_active: account.isActive,
          is_verified: account.isVerified,
        }))
        : [],
    };
  }
}
