import { ApiProperty } from '@nestjs/swagger';
import { StaffResponseDto } from './staff-response.dto';

export class StaffSessionResponseDto {
    @ApiProperty()
    access_token: string;

    @ApiProperty()
    refresh_token: string;

    @ApiProperty({ type: StaffResponseDto })
    user: StaffResponseDto;
}

export class StaffLogin2faRequiredResponseDto {
    @ApiProperty({ example: true })
    requires2fa: boolean;

    @ApiProperty({ example: 'uuid-of-staff' })
    staffId: string;
}
