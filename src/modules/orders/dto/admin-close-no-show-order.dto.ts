import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class AdminCloseNoShowOrderDto {
  @ApiProperty({
    description: 'Restore this no-show order quantity back to the offer before closing.',
    example: true,
    default: false,
  })
  @IsBoolean()
  restore_quantity: boolean;

  @ApiPropertyOptional({
    description: 'Admin-visible note for closing the no-show order.',
    example: 'Customer did not arrive after the pickup grace period.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
