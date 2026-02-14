import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StaffLoginDto {
    @ApiProperty({ example: 'admin@kamacaash.com', description: 'Email address' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: 'password123', description: 'Password' })
    @IsString()
    @IsNotEmpty()
    password: string;
}

export class StaffVerify2faDto {
    @ApiProperty({ example: 'uuid-of-staff', description: 'Staff User ID (returned from first login step if 2FA enabled)' })
    @IsString()
    @IsNotEmpty()
    staffId: string;

    @ApiProperty({ example: '123456', description: '2FA OTP Code' })
    @IsString()
    @IsNotEmpty()
    otp: string;
}
