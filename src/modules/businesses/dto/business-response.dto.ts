import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessStatus, BusinessVerificationStatus } from '../../../common/entities/enums/all.enums';
import { Business } from '../entities/business.entity';

export class BusinessResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  owner_name: string;

  @ApiProperty()
  legal_name: string;

  @ApiProperty()
  display_name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  category_id: string;

  @ApiProperty({ type: [String] })
  subcategories: string[];

  @ApiProperty({ type: [String] })
  tags: string[];


  @ApiPropertyOptional()
  primary_staff_id?: string;

  @ApiProperty()
  country_code: string;

  @ApiProperty()
  city: string;

  @ApiPropertyOptional()
  region?: string;

  @ApiPropertyOptional()
  district?: string;

  @ApiPropertyOptional()
  address_line1?: string;

  @ApiPropertyOptional()
  address_line2?: string;

  @ApiPropertyOptional()
  postal_code?: string;

  @ApiPropertyOptional()
  latitude?: number;

  @ApiPropertyOptional()
  longitude?: number;

  @ApiProperty()
  phone_e164: string;

  @ApiPropertyOptional()
  secondary_phone?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  website_url?: string;

  @ApiProperty({ type: Object })
  social_links: Record<string, string>;

  @ApiPropertyOptional()
  logo_url?: string;

  @ApiPropertyOptional()
  banner_url?: string;

  @ApiProperty({ type: [String] })
  gallery_images: string[];

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  short_description?: string;

  @ApiPropertyOptional()
  registration_number?: string;

  @ApiPropertyOptional()
  tax_id?: string;

  @ApiPropertyOptional()
  license_document_url?: string;

  @ApiProperty()
  currency_code: string;

  @ApiProperty()
  timezone: string;

  @ApiProperty()
  default_language: string;

  @ApiProperty({ enum: BusinessVerificationStatus })
  verification_status: BusinessVerificationStatus;

  @ApiProperty({ enum: BusinessStatus })
  status: BusinessStatus;

  @ApiProperty()
  is_active: boolean;

  @ApiProperty()
  is_archived: boolean;

  @ApiProperty()
  is_featured: boolean;

  @ApiPropertyOptional()
  featured_until?: Date;

  @ApiPropertyOptional()
  rejection_reason?: string;

  @ApiProperty({ type: Object })
  business_hours: Record<string, any[]>;

  @ApiProperty({ type: [Object] })
  holiday_hours: any[];

  @ApiProperty({ type: Object })
  settings: Record<string, any>;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty({ type: Object })
  metadata: Record<string, any>;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;

  @ApiPropertyOptional()
  deleted_at?: Date;

  @ApiPropertyOptional({ type: Object })
  bank_account?: {
    account_holder_name: string;
    bank_name: string;
    account_number: string;
    merchant_holder_name: string;
    merchant_name: string;
    merchant_number: string;
    sort_code?: string;
    iban?: string;
    swift_bic?: string;
    is_active: boolean;
    is_verified: boolean;
    verified_at?: Date;
  };

  @ApiPropertyOptional({ type: [Object] })
  opening_hours?: {
    day_of_week: number;
    opens_at?: string;
    closes_at?: string;
    is_closed?: boolean;
  }[];

  static fromEntity(business: Business): BusinessResponseDto {
    const coordinates = business.location?.coordinates;
    const lng = Array.isArray(coordinates) ? Number(coordinates[0]) : undefined;
    const lat = Array.isArray(coordinates) ? Number(coordinates[1]) : undefined;

    return {
      id: business.id,
      owner_name: business.owner_name,
      legal_name: business.legal_name,
      display_name: business.display_name,
      slug: business.slug,
      category_id: business.category_id,
      subcategories: business.subcategories,
      tags: business.tags,
      primary_staff_id: business.primary_staff_id,
      country_code: business.country_code,
      city: business.city,
      region: business.region,
      district: business.district,
      address_line1: business.address_line1,
      address_line2: business.address_line2,
      postal_code: business.postal_code,
      latitude: lat,
      longitude: lng,
      phone_e164: business.phone_e164,
      secondary_phone: business.secondary_phone,
      email: business.email,
      website_url: business.website_url,
      social_links: business.social_links,
      logo_url: business.logo_url,
      banner_url: business.banner_url,
      gallery_images: business.gallery_images,
      description: business.description,
      short_description: business.short_description,
      registration_number: business.registration_number,
      tax_id: business.tax_id,
      license_document_url: business.license_document_url,
      currency_code: business.currency_code,
      timezone: business.timezone,
      default_language: business.default_language,
      verification_status: business.verification_status,
      status: business.status,
      is_active: business.is_active,
      is_archived: business.is_archived,
      is_featured: business.is_featured,
      featured_until: business.featured_until,
      rejection_reason: business.rejection_reason,
      business_hours: business.business_hours,
      holiday_hours: business.holiday_hours,
      settings: business.settings,
      notes: business.notes,
      metadata: business.metadata,
      created_at: business.created_at,
      updated_at: business.updated_at,
      deleted_at: business.deleted_at,
      bank_account: business.bank_account
        ? {
          account_holder_name: business.bank_account.account_holder_name,
          bank_name: business.bank_account.bank_name,
          account_number: business.bank_account.account_number,
          merchant_holder_name: business.bank_account.merchant_holder_name,
          merchant_name: business.bank_account.merchant_name,
          merchant_number: business.bank_account.merchant_number,
          sort_code: business.bank_account.sort_code,
          iban: business.bank_account.iban,
          swift_bic: business.bank_account.swift_bic,
          is_active: business.bank_account.is_active,
          is_verified: business.bank_account.is_verified,
          verified_at: business.bank_account.verified_at,
        }
        : undefined,

      opening_hours: business.opening_hours?.map(hour => ({
        day_of_week: hour.day_of_week,
        opens_at: hour.opens_at,
        closes_at: hour.closes_at,
        is_closed: hour.is_closed,
      })),
    };
  }
}
