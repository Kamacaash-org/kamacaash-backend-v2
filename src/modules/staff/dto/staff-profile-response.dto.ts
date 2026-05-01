import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../common/entities/enums/all.enums';
import { StaffUser } from '../entities/staff-user.entity';

class StaffProfileBusinessDto {
    @ApiProperty()
    id!: string;

    @ApiPropertyOptional()
    display_name?: string;

    @ApiPropertyOptional()
    legal_name?: string;

    @ApiPropertyOptional()
    logo_url?: string;
}

export class StaffProfileResponseDto {
    @ApiProperty()
    id!: string;

    @ApiPropertyOptional()
    username?: string;

    @ApiProperty()
    email!: string;

    @ApiProperty()
    phone!: string;

    @ApiProperty()
    first_name!: string;

    @ApiProperty()
    last_name!: string;

    @ApiPropertyOptional()
    full_name?: string;

    @ApiPropertyOptional()
    profile_image_url?: string;

    @ApiProperty({ enum: UserRole })
    role!: UserRole;

    @ApiProperty()
    two_factor_enabled!: boolean;

    @ApiPropertyOptional({ type: StaffProfileBusinessDto })
    business?: StaffProfileBusinessDto;

    static fromEntity(staff: StaffUser): StaffProfileResponseDto {
        return {
            id: staff.id,
            username: staff.username,
            email: staff.email,
            phone: staff.phone_e164,
            first_name: staff.first_name,
            last_name: staff.last_name,
            full_name: staff.full_name || `${staff.first_name} ${staff.last_name}`,
            profile_image_url: staff.profile_image_url,
            role: staff.role,
            two_factor_enabled: staff.two_factor_enabled,
            business: staff.business
                ? {
                    id: staff.business.id,
                    display_name: staff.business.display_name,
                    legal_name: staff.business.legal_name,
                    logo_url: staff.business.logo_url,
                }
                : undefined,
        };
    }
}
