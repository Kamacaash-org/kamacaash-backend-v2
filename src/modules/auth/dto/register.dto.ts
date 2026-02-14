import { IsEmail, IsNotEmpty, IsString, Length, Matches, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
    @ApiProperty()
    @IsEmail()
    email: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Matches(/^\+[1-9]\d{1,14}$/, { message: 'Phone must be in E.164 format' })
    phone_e164: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    first_name?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    last_name?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @Length(2, 2)
    phone_country_code?: string;
}
