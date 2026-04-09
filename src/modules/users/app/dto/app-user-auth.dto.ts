import { IsString, IsNotEmpty, IsOptional, Length, IsEnum, MaxLength, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterAppUserDto {
    @ApiProperty({ example: '+252615000000', description: 'Phone number in E.164 format' })
    @IsString()
    @IsNotEmpty()
    phone: string;

    @ApiPropertyOptional({ example: 'SO', description: 'Country ISO code for timezone/currency defaults' })
    @IsOptional()
    @IsString()
    @Length(2, 2)
    phone_country_code?: string;

    // Device fields
    @ApiPropertyOptional({ example: 'some-uuid-or-device-id', description: 'Unique device identifier' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    device_id?: string;

    @ApiPropertyOptional({ example: 'ios', description: 'Device Type: ios, android, web' })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    device_type?: string;

    @ApiPropertyOptional({ example: 'iPhone 13 Pro', description: 'Device Name' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    device_name?: string;

    @ApiPropertyOptional({ example: 'SM-G998B', description: 'Device Model' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    device_model?: string;

    @ApiPropertyOptional({ example: '16.5.1', description: 'OS Version' })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    os_version?: string;

    @ApiPropertyOptional({ example: '1.0.0', description: 'App Version' })
    @IsOptional()
    @IsString()
    @MaxLength(20)
    app_version?: string;

    @ApiPropertyOptional({ description: 'Push notification token from FCM/APNs' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    push_token?: string;
}

export class VerifyAppUserDto {
    @ApiProperty({ example: '+252615000000', description: 'Phone number' })
    @IsString()
    @IsNotEmpty()
    phone: string;

    @ApiProperty({ example: '123456', description: 'OTP Code' })
    @IsString()
    @IsNotEmpty()
    otp: string;
}

export class ResendOtpDto {
    @ApiProperty({ example: '+252615000000', description: 'Phone number' })
    @IsString()
    @IsNotEmpty()
    phone: string;
}

export class UpdateAppUserProfileDto {
    @ApiPropertyOptional({ example: 'John', description: 'First Name' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    first_name?: string;

    @ApiPropertyOptional({ example: 'Doe', description: 'Last Name' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    last_name?: string;

    @ApiPropertyOptional({ example: 'john@example.com', description: 'Email address' })
    @IsOptional()
    @IsEmail()
    @MaxLength(255)
    email?: string;

    @ApiPropertyOptional({ example: 'en', description: 'Preferred Language Code (en, so, ar)' })
    @IsOptional()
    @IsString()
    @MaxLength(10)
    preferred_language?: string;

    @ApiPropertyOptional({ example: 'USD', description: 'Preferred Currency' })
    @IsOptional()
    @IsString()
    @MaxLength(3)
    preferred_currency?: string;
}
