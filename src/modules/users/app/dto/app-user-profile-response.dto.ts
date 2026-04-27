import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppUser } from '../../entities/app-user.entity';

export class AppUserProfileStatisticsDto {
    @ApiProperty()
    total_orders!: number;

    @ApiProperty()
    total_completed_orders!: number;

    @ApiProperty()
    total_cancelled_orders!: number;

    @ApiProperty()
    total_saved_amount_minor!: number;

    @ApiProperty()
    total_saved_amount!: number;

    @ApiProperty()
    total_spent_amount_minor!: number;

    @ApiProperty()
    total_spent_amount!: number;

    @ApiProperty()
    current_points!: number;

    @ApiProperty()
    lifetime_points_earned!: number;
}

export class AppUserProfileResponseDto {
    @ApiProperty()
    id!: string;

    @ApiProperty()
    email!: string;

    @ApiProperty()
    phone_e164!: string;

    @ApiPropertyOptional()
    phone_country_code?: string;

    @ApiPropertyOptional()
    first_name?: string;

    @ApiPropertyOptional()
    last_name?: string;

    @ApiPropertyOptional()
    full_name?: string;

    @ApiPropertyOptional()
    profile_image_url?: string;

    @ApiProperty()
    phone_verified!: boolean;

    @ApiProperty()
    email_verified!: boolean;

    @ApiProperty()
    identity_verified!: boolean;

    @ApiPropertyOptional()
    verified_at?: Date;

    @ApiProperty()
    preferred_language!: string;

    @ApiProperty()
    preferred_currency!: string;

    @ApiPropertyOptional()
    default_address?: string;

    @ApiPropertyOptional()
    default_city?: string;

    @ApiProperty()
    status!: string;

    @ApiProperty()
    is_banned!: boolean;

    @ApiPropertyOptional()
    last_login_at?: Date;

    @ApiProperty()
    stats!: AppUserProfileStatisticsDto;

    private static fromMinorUnits(amount: number | null | undefined): number {
        return Number(((amount ?? 0) / 100).toFixed(2));
    }

    static fromEntity(user: AppUser): AppUserProfileResponseDto {
        return {
            id: user.id,
            email: user.email,
            phone_e164: user.phone_e164,
            phone_country_code: user.phone_country_code,
            first_name: user.first_name,
            last_name: user.last_name,
            full_name: user.full_name,
            profile_image_url: user.profile_image_url,
            phone_verified: user.phone_verified,
            email_verified: user.email_verified,
            identity_verified: user.identity_verified,
            verified_at: user.verified_at,
            preferred_language: user.preferred_language,
            preferred_currency: user.preferred_currency,
            default_address: user.default_address,
            default_city: user.default_city,
            status: user.status,
            is_banned: user.is_banned,
            last_login_at: user.last_login_at,
            stats: {
                total_orders: user.total_orders ?? 0,
                total_completed_orders: user.total_completed_orders ?? 0,
                total_cancelled_orders: user.total_cancelled_orders ?? 0,
                total_saved_amount_minor: user.total_saved_amount_minor ?? 0,
                total_saved_amount: AppUserProfileResponseDto.fromMinorUnits(user.total_saved_amount_minor),
                total_spent_amount_minor: user.total_spent_amount_minor ?? 0,
                total_spent_amount: AppUserProfileResponseDto.fromMinorUnits(user.total_spent_amount_minor),
                current_points: user.current_points ?? 0,
                lifetime_points_earned: user.lifetime_points_earned ?? 0,
            },
        };
    }
}
