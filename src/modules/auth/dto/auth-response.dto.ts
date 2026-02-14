import { ApiProperty } from '@nestjs/swagger';
import { AppUser } from '../../users/entities/app-user.entity';

export class AuthOtpRequestResponseDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  isNewUser: boolean;

  @ApiProperty()
  timezone: string;

  @ApiProperty()
  timestamp: string;
}

export class AuthVerifyResponseDto {
  @ApiProperty()
  access_token: string;

  @ApiProperty()
  refresh_token: string;

  @ApiProperty({ type: Object })
  user: AppUser;

  @ApiProperty()
  timezone: string;

  @ApiProperty()
  timestamp: string;
}

export class AuthProfileResponseDto {
  @ApiProperty({ type: Object })
  user: any;

  @ApiProperty()
  timezone: string;

  @ApiProperty()
  timestamp: string;
}
