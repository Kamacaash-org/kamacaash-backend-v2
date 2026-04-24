import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BusinessStatus } from 'src/common/entities/enums/all.enums';

export class ToggleBusinessStatusDto {
    @ApiProperty({ example: BusinessStatus.ACTIVE })
    @IsBoolean()
    business_status!: BusinessStatus;
}