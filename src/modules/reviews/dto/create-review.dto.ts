import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateReviewDto {
    @ApiProperty({ example: '7ca6d36e-9ad5-46fe-9e79-4f313f721600' })
    @IsString()
    @IsNotEmpty()
    order_id!: string;

    @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
    @IsInt()
    @Min(1)
    @Max(5)
    rating!: number;

    @ApiPropertyOptional({ example: 'Great pickup experience and the food was fresh.' })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    comment?: string;
}
