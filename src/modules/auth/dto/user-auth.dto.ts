import { IsString, IsNotEmpty, IsOptional, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserRegisterDto {
    @ApiProperty({ example: '+252615000000', description: 'Phone number in E.164 format' })
    @IsString()
    @IsNotEmpty()
    phone: string;

    @ApiPropertyOptional({ example: 'SO', description: 'Country ISO code for timezone/currency defaults' })
    @IsOptional()
    @IsString()
    @Length(2, 2)
    phone_country_code?: string;

    @ApiPropertyOptional({ example: 'John', description: 'First Name' })
    @IsOptional()
    @IsString()
    first_name?: string;

    @ApiPropertyOptional({ example: 'Doe', description: 'Last Name' })
    @IsOptional()
    @IsString()
    last_name?: string;
}

export class UserLoginDto {
    @ApiProperty({ example: '+252615000000', description: 'Phone number in E.164 format' })
    @IsString()
    @IsNotEmpty()
    phone: string;
}

export class UserVerifyDto {
    @ApiProperty({ example: '+252615000000', description: 'Phone number' })
    @IsString()
    @IsNotEmpty()
    phone: string;

    @ApiProperty({ example: '123456', description: 'OTP Code' })
    @IsString()
    @IsNotEmpty()
    otp: string;
}
