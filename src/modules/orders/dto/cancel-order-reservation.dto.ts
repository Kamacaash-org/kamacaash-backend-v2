import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelOrderReservationDto {
  @ApiPropertyOptional({
    description: 'Optional reason provided by the user when cancelling the reservation.',
    example: 'Changed my mind',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
