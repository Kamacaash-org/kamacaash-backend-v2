import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaymentProvider, PayoutMethod } from '../../../common/entities/enums/all.enums';

export class MarkOrderPaidDto {
  @ApiPropertyOptional({ enum: PaymentProvider, example: PaymentProvider.EVC })
  @IsOptional()
  @IsEnum(PaymentProvider)
  payment_provider?: PaymentProvider;

  @ApiPropertyOptional({ enum: PayoutMethod, example: PayoutMethod.MOBILE_MONEY })
  @IsOptional()
  @IsEnum(PayoutMethod)
  payment_method?: PayoutMethod;

  @ApiPropertyOptional({
    description: 'Gateway payment intent/reference id.',
    example: 'pi_123456789',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  payment_intent_id?: string;

  @ApiPropertyOptional({
    description: 'Gateway transaction id returned after successful payment.',
    example: 'txn_123456789',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  payment_transaction_id?: string;
}
