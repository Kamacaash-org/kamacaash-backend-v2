import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class AdminCancelOrderDto {
  @ApiProperty({
    description: 'Admin-visible reason for cancelling the order.',
    example: 'Customer requested cancellation before pickup.',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  reason: string;

  @ApiPropertyOptional({
    description: 'Whether to refund a confirmed payment when the order is cancelled.',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  refund?: boolean;
}
