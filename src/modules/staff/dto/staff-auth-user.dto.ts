import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../common/entities/enums/all.enums';
import { StaffUser } from '../entities/staff-user.entity';
import { IsUUID } from 'class-validator';

export class StaffAuthUserDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    email: string;

    @ApiProperty()
    username: string;

    @ApiProperty({ enum: UserRole })
    role: UserRole;

    @ApiProperty({ type: [String] })
    permissions: string[];

    @ApiProperty()
    must_change_password: boolean;

    @ApiProperty()
    @IsUUID()
    business_id?: string | null;


    static toAuthUser(staff: StaffUser): StaffAuthUserDto {
        return {
            id: staff.id,
            email: staff.email,
            username: staff.username,
            business_id: staff.business_id,
            role: staff.role,
            permissions: staff.permissions,
            must_change_password: staff.must_change_password,
        };
    }
}

