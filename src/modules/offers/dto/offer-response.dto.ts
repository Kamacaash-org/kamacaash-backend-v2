import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OfferStatus } from '../../../common/entities/enums/all.enums';
import { Offer } from '../entities/offer.entity';

class OfferPickupWindowResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    starts_at: Date;

    @ApiProperty()
    ends_at: Date;

    @ApiPropertyOptional()
    max_pickups_per_window?: number;
}

export class OfferResponseDto {
    @ApiProperty()
    id: string;
    @ApiProperty()
    business_id: string;
    @ApiProperty()
    category_id: string;
    @ApiProperty()
    created_by_staff_id: string;
    @ApiPropertyOptional()
    updated_by?: string;
    @ApiPropertyOptional()
    archived_by?: string;
    @ApiPropertyOptional()
    archived_at?: Date;
    @ApiProperty()
    title: string;
    @ApiProperty()
    slug: string;
    @ApiProperty()
    description: string;
    @ApiProperty()
    short_description: string;
    @ApiProperty({ type: [String] })
    tags: string[];
    @ApiProperty({ type: [String] })
    dietary_info: string[];
    @ApiProperty({ type: [String] })
    allergen_info: string[];
    @ApiProperty()
    main_image_url: string;
    @ApiProperty({ type: [String] })
    gallery_images: string[];
    @ApiProperty()
    currency_code: string;
    @ApiPropertyOptional()
    business_timezone?: string;
    @ApiPropertyOptional()
    pickup_start_local?: string;
    @ApiPropertyOptional()
    pickup_end_local?: string;
    @ApiProperty()
    original_price_minor: number;
    @ApiProperty()
    offer_price_minor: number;
    @ApiProperty()
    discount_percentage: number;
    @ApiProperty()
    quantity_total: number;
    @ApiProperty()
    quantity_remaining: number;
    @ApiProperty()
    quantity_reserved: number;
    @ApiProperty()
    max_per_user: number;
    @ApiProperty({ enum: OfferStatus })
    status: OfferStatus;
    @ApiProperty()
    is_active: boolean;
    @ApiProperty()
    is_archived: boolean;
    @ApiProperty()
    is_featured: boolean;
    @ApiProperty()
    is_limited_time: boolean;
    @ApiProperty()
    pickup_start: Date;
    @ApiProperty()
    pickup_end: Date;
    @ApiPropertyOptional({ type: [OfferPickupWindowResponseDto] })
    pickup_windows?: OfferPickupWindowResponseDto[];
    @ApiProperty()
    pickup_instructions: string;
    @ApiProperty()
    advance_notice_hours: number;
    @ApiProperty()
    expires_at: Date;
    @ApiProperty()
    published_at: Date;
    @ApiProperty()
    total_orders: number;
    @ApiProperty()
    completed_orders: number;
    @ApiProperty()
    total_collected_quantity: number;
    @ApiProperty()
    total_revenue_minor: number;
    @ApiProperty()
    average_rating: number;
    @ApiProperty()
    total_reviews: number;
    @ApiProperty()
    total_views: number;
    @ApiProperty()
    notes: string;
    @ApiProperty({ type: Object })
    metadata: Record<string, any>;
    @ApiProperty()
    created_at: Date;
    @ApiProperty()
    updated_at: Date;
    @ApiProperty()
    deleted_at: Date;

    @ApiPropertyOptional({ type: Object })
    created_by_staff?: { id: string; name: string; phone: string } | null;

    @ApiPropertyOptional({ type: Object })
    updated_by_staff?: { id: string; name: string; phone: string } | null;

    @ApiPropertyOptional({ type: Object })
    archived_by_staff?: { id: string; name: string; phone: string } | null;

    private static toLocal(date: Date | null | undefined, timezone?: string): string | undefined {
        if (!date || !timezone) return undefined;
        return new Intl.DateTimeFormat('sv-SE', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        }).format(date);
    }

    static fromEntity(offer: Offer): OfferResponseDto {
        const timezone = (offer as any).business?.timezone;
        return {
            id: offer.id,
            business_id: offer.business_id,
            category_id: offer.category_id,
            created_by_staff_id: offer.created_by_staff_id,
            updated_by: (offer as any).updated_by,
            archived_by: (offer as any).archived_by,
            archived_at: (offer as any).archived_at,
            title: offer.title,
            slug: offer.slug,
            description: offer.description,
            short_description: offer.short_description,
            tags: offer.tags,
            dietary_info: offer.dietary_info,
            allergen_info: offer.allergen_info,
            main_image_url: offer.main_image_url,
            gallery_images: offer.gallery_images,
            currency_code: offer.currency_code,
            business_timezone: timezone,
            pickup_start_local: OfferResponseDto.toLocal(offer.pickup_start, timezone),
            pickup_end_local: OfferResponseDto.toLocal(offer.pickup_end, timezone),
            original_price_minor: offer.original_price_minor,
            offer_price_minor: offer.offer_price_minor,
            discount_percentage: offer.discount_percentage,
            quantity_total: offer.quantity_total,
            quantity_remaining: offer.quantity_remaining,
            quantity_reserved: offer.quantity_reserved,
            max_per_user: offer.max_per_user,
            status: offer.status,
            is_active: offer.is_active,
            is_archived: offer.is_archived,
            is_featured: offer.is_featured,
            is_limited_time: offer.is_limited_time,
            pickup_start: offer.pickup_start,
            pickup_end: offer.pickup_end,
            pickup_windows: (offer as any).pickup_windows?.map((w: any) => ({
                id: w.id,
                starts_at: w.starts_at,
                ends_at: w.ends_at,
                max_pickups_per_window: w.max_pickups_per_window,
            })) ?? [],
            pickup_instructions: offer.pickup_instructions,
            advance_notice_hours: offer.advance_notice_hours,
            expires_at: offer.expires_at,
            published_at: offer.published_at,
            total_orders: offer.total_orders,
            completed_orders: offer.completed_orders,
            total_collected_quantity: offer.total_collected_quantity,
            total_revenue_minor: offer.total_revenue_minor,
            average_rating: offer.average_rating,
            total_reviews: offer.total_reviews,
            total_views: offer.total_views,
            notes: offer.notes,
            metadata: offer.metadata,
            created_at: offer.created_at,
            updated_at: offer.updated_at,
            deleted_at: offer.deleted_at,
            created_by_staff: (offer as any).created_by_staff
                ? {
                    id: (offer as any).created_by_staff.id,
                    name: `${(offer as any).created_by_staff.first_name} ${(offer as any).created_by_staff.last_name}`,
                    phone: (offer as any).created_by_staff.phone_e164,
                }
                : null,
            updated_by_staff: (offer as any).updater
                ? {
                    id: (offer as any).updater.id,
                    name: `${(offer as any).updater.first_name} ${(offer as any).updater.last_name}`,
                    phone: (offer as any).updater.phone_e164,
                }
                : null,
            archived_by_staff: (offer as any).archiver
                ? {
                    id: (offer as any).archiver.id,
                    name: `${(offer as any).archiver.first_name} ${(offer as any).archiver.last_name}`,
                    phone: (offer as any).archiver.phone_e164,
                }
                : null,
        };
    }
}
