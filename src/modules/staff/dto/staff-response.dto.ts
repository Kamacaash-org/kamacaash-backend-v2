import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { sexOptions, UserRole } from '../../../common/entities/enums/all.enums';
import { StaffUser } from '../entities/staff-user.entity';

export class StaffResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    email: string;

    @ApiPropertyOptional()
    username?: string;

    @ApiPropertyOptional()
    country_code?: string;

    @ApiProperty()
    phone_e164: string;

    @ApiProperty()
    first_name: string;

    @ApiProperty()
    last_name: string;

    @ApiPropertyOptional()
    full_name?: string;

    @ApiPropertyOptional()
    profile_image_url?: string;

    @ApiProperty({ enum: UserRole })
    role: UserRole;

    @ApiProperty({ enum: sexOptions })
    sex: sexOptions;

    @ApiProperty({ type: [String] })
    permissions: string[];

    @ApiProperty()
    is_active: boolean;

    @ApiProperty()
    is_admin_approved: boolean;

    @ApiPropertyOptional()
    approved_by?: string;

    @ApiPropertyOptional()
    approved_at?: Date;

    @ApiProperty()
    must_change_password: boolean;

    @ApiPropertyOptional()
    last_login_at?: Date;

    @ApiPropertyOptional()
    last_login_ip?: string;

    @ApiProperty()
    login_attempts: number;

    @ApiPropertyOptional()
    locked_until?: Date;

    @ApiPropertyOptional()
    password_changed_at?: Date;

    @ApiProperty()
    two_factor_enabled: boolean;

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

    static fromEntity(staff: StaffUser): StaffResponseDto {
        return {
            id: staff.id,
            email: staff.email,
            username: staff.username,
            country_code: staff.country_code,
            phone_e164: staff.phone_e164,
            first_name: staff.first_name,
            last_name: staff.last_name,
            full_name: staff.full_name,
            profile_image_url: staff.profile_image_url,
            role: staff.role,
            permissions: staff.permissions,
            is_active: staff.is_active,
            is_admin_approved: staff.is_admin_approved,
            approved_by: staff.approved_by,
            approved_at: staff.approved_at,
            must_change_password: staff.must_change_password,
            last_login_at: staff.last_login_at,
            last_login_ip: staff.last_login_ip,
            login_attempts: staff.login_attempts,
            locked_until: staff.locked_until,
            password_changed_at: staff.password_changed_at,
            two_factor_enabled: staff.two_factor_enabled,
            notes: staff.notes,
            sex: staff.sex || null,
            metadata: staff.metadata,
            created_at: staff.created_at,
            updated_at: staff.updated_at,
            deleted_at: staff.deleted_at,
        };
    }
}
