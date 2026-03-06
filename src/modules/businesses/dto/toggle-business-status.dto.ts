import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ToggleBusinessStatusDto {
    @ApiProperty({ example: true })
    @IsBoolean()
    is_active: boolean;
}