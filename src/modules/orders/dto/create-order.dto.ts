import { IsUUID, IsNumber, Min, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderDto {
    @ApiProperty({
        description: 'Offer id to reserve.',
        example: '9f8a7b6c-5d4e-3f2a-1b0c-9d8e7f6a5b4c',
    })
    @IsUUID()
    offer_id: string;

    @ApiProperty({
        description: 'Quantity to reserve from the offer.',
        example: 1,
        minimum: 1,
    })
    @IsNumber()
    @Min(1)
    quantity: number;

    // @ApiPropertyOptional({
    //     description: 'Optional preferred pickup time inside the offer pickup window (ISO string).',
    //     example: '2026-04-16T15:30:00.000Z',
    // })
    // @IsOptional()
    // @IsDateString()
    // pickup_time?: string;
}
