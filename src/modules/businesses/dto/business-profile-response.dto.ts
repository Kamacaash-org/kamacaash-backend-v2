import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Business } from '../entities/business.entity';
import { CreateBusinessOpeningHourDto } from './OpeningHours.dto';

export class BusinessProfileResponseDto {
    @ApiProperty()
    id!: string;

    @ApiProperty()
    display_name!: string;

    @ApiPropertyOptional()
    legal_name?: string;

    @ApiPropertyOptional()
    logo_url?: string;

    @ApiPropertyOptional()
    banner_url?: string;

    @ApiProperty({ type: [String] })
    gallery_images!: string[];

    @ApiPropertyOptional()
    description?: string;

    @ApiPropertyOptional()
    short_description?: string;

    @ApiPropertyOptional()
    email?: string;

    @ApiPropertyOptional()
    phone?: string;

    @ApiPropertyOptional()
    secondary_phone?: string;

    @ApiPropertyOptional()
    website_url?: string;

    @ApiPropertyOptional({ type: Object })
    social_links?: Record<string, string>;

    @ApiPropertyOptional({ type: [CreateBusinessOpeningHourDto] })
    open_hours?: CreateBusinessOpeningHourDto[];

    static fromEntity(business: Business): BusinessProfileResponseDto {
        return {
            id: business.id,
            display_name: business.display_name,
            legal_name: business.legal_name,
            logo_url: business.logo_url,
            banner_url: business.banner_url,
            gallery_images: business.gallery_images ?? [],
            description: business.description,
            short_description: business.short_description,
            email: business.email,
            phone: business.phone,
            secondary_phone: business.secondary_phone,
            website_url: business.website_url,
            social_links: business.social_links,
            open_hours: business.metadata?.open_hours ?? [],
        };
    }
}
