import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateBusinessOpeningHourDto } from './OpeningHours.dto';

export class UpdateBusinessSettingsDto {
    private static parseJson(value: unknown): unknown {
        if (typeof value !== 'string') return value;
        const trimmed = value.trim();
        if (!trimmed) return value;
        try {
            return JSON.parse(trimmed);
        } catch {
            return value;
        }
    }

    private static normalizeOpenHours(value: unknown): unknown {
        const parsed = UpdateBusinessSettingsDto.parseJson(value);
        const normalizedArray = Array.isArray(parsed)
            ? parsed
            : parsed && typeof parsed === 'object'
                ? [parsed]
                : parsed;

        if (!Array.isArray(normalizedArray)) return normalizedArray;

        return normalizedArray.map((item) => {
            if (!item || typeof item !== 'object') return item;

            const openingHour = item as Record<string, unknown>;
            return {
                ...openingHour,
                day_of_week:
                    openingHour.day_of_week !== undefined && openingHour.day_of_week !== null
                        ? Number(openingHour.day_of_week)
                        : openingHour.day_of_week,
            };
        });
    }

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    logo_url?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    banner_url?: string;

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @Transform(({ value }) => UpdateBusinessSettingsDto.parseJson(value))
    @IsArray()
    gallery_images?: string[];

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(500)
    short_description?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(255)
    display_name?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(50)
    phone?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(50)
    secondary_phone?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(255)
    website_url?: string;

    @ApiPropertyOptional({ type: Object })
    @IsOptional()
    @Transform(({ value }) => UpdateBusinessSettingsDto.parseJson(value))
    social_links?: Record<string, string>;

    @ApiPropertyOptional({ type: [CreateBusinessOpeningHourDto] })
    @IsOptional()
    @Transform(({ value }) => UpdateBusinessSettingsDto.normalizeOpenHours(value))
    open_hours?: Array<Record<string, unknown>>;
}
