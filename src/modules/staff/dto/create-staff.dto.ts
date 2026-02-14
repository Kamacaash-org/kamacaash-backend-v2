import {
    IsArray,
    IsBoolean,
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../common/entities/enums/all.enums';

export class CreateStaffDto {
    @ApiProperty({ example: 'admin@kamacaash.com' })
    @IsEmail()
    email: string;

    @ApiPropertyOptional({ example: 'john_admin' })
    @IsOptional()
    @IsString()
    @Length(3, 100)
    username?: string;

    @ApiPropertyOptional({ example: 'US', minLength: 2, maxLength: 2 })
    @IsOptional()
    @IsString()
    @Length(2, 2)
    country_code?: string;

    @ApiProperty({ example: '+15550001111' })
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

    @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.jpg' })
    @IsOptional()
    @IsString()
    profile_image_url?: string;

    @ApiProperty({ enum: UserRole })
    @IsEnum(UserRole)
    role: UserRole;

    @ApiPropertyOptional({ example: 'Temp@1234' })
    @IsOptional()
    @IsString()
    @Length(8, 100)
    password?: string;

    @ApiPropertyOptional({ type: [String], example: ['staff:read', 'staff:update'] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    permissions?: string[];

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    is_active?: boolean;

    @ApiPropertyOptional({ example: false })
    @IsOptional()
    @IsBoolean()
    two_factor_enabled?: boolean;

    @ApiPropertyOptional({ example: 'Operations team member' })
    @IsOptional()
    @IsString()
    notes?: string;
}
