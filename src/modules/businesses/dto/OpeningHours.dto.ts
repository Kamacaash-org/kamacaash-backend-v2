import {
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBusinessOpeningHourDto {
    @ApiProperty({ minimum: 1, maximum: 7 })
    @IsNumber()
    @Min(1)
    @Max(7)
    day_of_week: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    opens_at?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    closes_at?: string;
}