import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { PaymentProvider, PayoutMethod } from '../../../common/entities/enums/all.enums';

export class InitiatePushPaymentDto {
    @ApiPropertyOptional({ enum: PaymentProvider, example: PaymentProvider.WAAFI, default: PaymentProvider.WAAFI })
    @IsOptional()
    @IsEnum(PaymentProvider)
    payment_provider?: PaymentProvider = PaymentProvider.WAAFI;

    @ApiPropertyOptional({ enum: PayoutMethod, example: PayoutMethod.MWALLET_ACCOUNT, default: PayoutMethod.MWALLET_ACCOUNT })
    @IsOptional()
    @IsEnum(PayoutMethod)
    payment_method?: PayoutMethod = PayoutMethod.MWALLET_ACCOUNT;

    @ApiProperty({ example: '252618827482', description: 'Customer WAAFI wallet account number.' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    @Matches(/^\d+$/, { message: 'account_no must contain only digits' })
    account_no!: string;

    @ApiPropertyOptional({ example: 'WAAFI-REQ-123456', description: 'Client-supplied idempotency key or provider request id.' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    request_id?: string;

    @ApiPropertyOptional({ example: 'REF-ORDER-1001', description: 'Merchant reference id shown to the payment provider.' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    reference_id?: string;

    @ApiPropertyOptional({ example: 'INV-ORDER-1001', description: 'Merchant invoice id shown to the payment provider.' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    invoice_id?: string;

    @ApiPropertyOptional({ example: 'USD', description: 'ISO currency code.' })
    @IsOptional()
    @IsString()
    @MaxLength(3)
    currency?: string;

    @ApiPropertyOptional({ example: 'Order payment', description: 'Transaction description sent to the provider.' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    description?: string;
}
