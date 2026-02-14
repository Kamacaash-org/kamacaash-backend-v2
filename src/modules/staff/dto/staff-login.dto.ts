import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class StaffLoginDto {
    @ApiProperty({ example: 'admin' })
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiProperty({ example: 'password123' })
    @IsString()
    @IsNotEmpty()
    password: string;
}
