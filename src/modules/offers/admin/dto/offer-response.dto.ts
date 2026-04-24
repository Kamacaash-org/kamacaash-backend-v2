import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OfferStatus } from '../../../../common/entities/enums/all.enums';
import { Offer } from '../../entities/offer.entity';


export class OfferResponseDto {
    @ApiProperty()
    id!: string;
    @ApiProperty()
    business_id!: string;

    business_name?: string;

    @ApiPropertyOptional()
    archived_at?: Date;
    @ApiProperty()
    title!: string;

    @ApiProperty()
    description?: string;
    @ApiProperty()
    short_description?: string;
    @ApiProperty({ type: [String] })
    tags?: string[];
    @ApiProperty({ type: [String] })
    dietary_info?: string[];
    @ApiProperty({ type: [String] })
    allergen_info?: string[];
    @ApiProperty()
    main_image_url?: string;
    @ApiProperty({ type: [String] })
    gallery_images?: string[];
    contents?: string[];
    @ApiPropertyOptional()
    pickup_start_local?: string;
    @ApiPropertyOptional()
    pickup_end_local?: string;
    @ApiProperty()
    original_price_minor?: number;
    @ApiProperty()
    offer_price_minor?: number;
    @ApiProperty()
    discount_percentage?: number;
    @ApiProperty()
    quantity_total?: number;
    @ApiProperty()
    quantity_remaining?: number;

    @ApiProperty()
    max_per_user?: number;
    @ApiProperty({ enum: OfferStatus })
    status?: OfferStatus;

    @ApiProperty()
    is_archived?: boolean;
    @ApiProperty()
    is_featured?: boolean;

    @ApiProperty()
    pickup_start?: Date;
    @ApiProperty()
    pickup_end?: Date;

    @ApiProperty()
    pickup_instructions?: string;
    @ApiProperty()
    advance_notice_hours?: number;
    @ApiProperty()
    expires_at?: Date;
    @ApiProperty()
    published_at?: Date;
    @ApiProperty()
    notes?: string;

    is_order_time_limited?: boolean;
    order_cutoff_at?: Date;
    @ApiProperty()
    created_at?: Date;
    @ApiProperty()
    updated_at?: Date;
    @ApiProperty()
    deleted_at?: Date;

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

    private static fromMinorUnits(amount: number | null | undefined): number {
        return Number(((amount ?? 0) / 100).toFixed(2));
    }

    static fromEntity(offer: Offer): OfferResponseDto {
        const timezone = (offer as any).country?.timezone;
        return {
            id: offer.id,
            business_id: offer.business_id,
            archived_at: (offer as any).archived_at,
            title: offer.title,
            business_name: offer.business?.display_name,
            description: offer.description,
            short_description: offer.short_description,
            tags: offer.tags,
            dietary_info: offer.dietary_info,
            allergen_info: offer.allergen_info,
            main_image_url: offer.main_image_url,
            gallery_images: offer.gallery_images,
            pickup_start_local: OfferResponseDto.toLocal(offer.pickup_start, timezone),
            pickup_end_local: OfferResponseDto.toLocal(offer.pickup_end, timezone),
            original_price_minor: OfferResponseDto.fromMinorUnits(offer.original_price_minor),
            offer_price_minor: OfferResponseDto.fromMinorUnits(offer.offer_price_minor),
            discount_percentage: offer.discount_percentage,
            quantity_total: offer.quantity_total,
            quantity_remaining: offer.quantity_remaining,
            is_order_time_limited: offer.is_order_time_limited,
            order_cutoff_at: offer.order_cutoff_at,
            contents: offer.contents,
            max_per_user: offer.max_per_user,
            status: offer.status,
            is_archived: offer.is_archived,
            is_featured: offer.is_featured,
            pickup_start: offer.pickup_start,
            pickup_end: offer.pickup_end,
            pickup_instructions: offer.pickup_instructions,
            advance_notice_hours: offer.advance_notice_hours,
            expires_at: offer.expires_at,
            published_at: offer.published_at,
            notes: offer.notes,
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
