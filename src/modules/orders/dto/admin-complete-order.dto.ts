import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class AdminCompleteOrderDto {
  @ApiProperty({
    description: 'Customer pickup pin code.',
    example: 'A1B2C3',
    minLength: 4,
    maxLength: 10,
  })
  @IsString()
  @Length(4, 10)
  pin_code: string;
}
