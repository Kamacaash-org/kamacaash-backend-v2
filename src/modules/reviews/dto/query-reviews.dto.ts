import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class QueryReviewsDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    business_id?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    offer_id?: string;
}
