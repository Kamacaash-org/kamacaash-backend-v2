import {
    IsArray,
    IsBoolean,
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { sexOptions, UserRole } from '../../../common/entities/enums/all.enums';
import { Transform } from 'class-transformer';

export class CreateStaffDto {
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

    private static toBoolean(value: unknown): unknown {
        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            if (normalized === 'true') return true;
            if (normalized === 'false') return false;
        }
        return value;
    }

    @ApiProperty({ example: 'admin@kamacaash.com' })
    @IsEmail()
    email: string;

    @ApiPropertyOptional({ example: 'john_admin' })
    @IsOptional()
    @IsString()
    @Length(3, 100)
    username?: string;



    @ApiProperty({ example: '617522228' })
    @IsString()
    @IsNotEmpty()
    @Length(5, 50)
    phone_e164: string;

    @ApiProperty({ example: 'John' })
    @IsString()
    @IsNotEmpty()
    @Length(1, 100)
    first_name: string;

    @ApiProperty({ example: 'Doe' })
    @IsString()
    @IsNotEmpty()
    @Length(1, 100)
    last_name: string;

    @ApiProperty()
    @IsUUID()
    business_id: string;

    @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.jpg' })
    @IsOptional()
    @IsString()
    profile_image_url?: string;

    @ApiProperty({ enum: UserRole })
    @IsEnum(UserRole)
    role: UserRole;

    @ApiProperty({ enum: sexOptions })
    @IsEnum(sexOptions)
    sex: sexOptions;

    @ApiPropertyOptional({ example: 'Temp@1234' })
    @IsOptional()
    @IsString()
    @Length(8, 100)
    password: string;

    @ApiPropertyOptional({ type: [String], example: ['staff:read', 'staff:update'] })
    @IsOptional()
    @Transform(({ value }) => CreateStaffDto.parseJson(value))
    @IsArray()
    @IsString({ each: true })
    permissions?: string[];

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @Transform(({ value }) => CreateStaffDto.toBoolean(value))
    @IsBoolean()
    is_active?: boolean;

    @ApiPropertyOptional({ example: false })
    @IsOptional()
    @Transform(({ value }) => CreateStaffDto.toBoolean(value))
    @IsBoolean()
    two_factor_enabled?: boolean;

    @ApiPropertyOptional({ example: 'Operations team member' })
    @IsOptional()
    @IsString()
    notes?: string;
}
