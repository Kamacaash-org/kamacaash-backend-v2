import { IsUUID, IsNumber, Min, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderDto {
    @ApiProperty()
    @IsUUID()
    offer_id: string;

    @ApiProperty()
    @IsNumber()
    @Min(1)
    quantity: number;

    @ApiPropertyOptional({ description: 'Optional preferred pickup time (ISO string)' })
    @IsOptional()
    @IsDateString()
    pickup_time?: string;
}
