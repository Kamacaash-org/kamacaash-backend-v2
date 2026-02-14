import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class StaffVerify2faDto {
    @ApiProperty({ example: 'uuid-of-staff' })
    @IsString()
    @IsNotEmpty()
    staffId: string;

    @ApiProperty({ example: '123456' })
    @IsString()
    @IsNotEmpty()
    otp: string;
}
