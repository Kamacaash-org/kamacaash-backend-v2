import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus, PaymentProvider } from '../../../common/entities/enums/all.enums';
import { Payment } from '../entities/payment.entity';

export class PaymentAttemptResponseDto {
    @ApiProperty()
    id!: string;

    @ApiProperty()
    payment_number!: string;

    @ApiProperty()
    order_id!: string;

    @ApiProperty({ enum: PaymentProvider })
    provider!: PaymentProvider;

    @ApiProperty({ enum: PaymentStatus })
    status!: PaymentStatus;

    @ApiPropertyOptional()
    request_id?: string;

    @ApiPropertyOptional()
    reference_id?: string;

    @ApiPropertyOptional()
    invoice_id?: string;

    @ApiPropertyOptional()
    provider_status?: string;

    @ApiPropertyOptional()
    provider_response_code?: string;

    @ApiPropertyOptional()
    provider_error_code?: string;

    @ApiPropertyOptional()
    message?: string;

    @ApiPropertyOptional()
    paid_at?: Date;

    @ApiProperty()
    can_retry!: boolean;

    static fromEntity(payment: Payment, message: string, canRetry: boolean): PaymentAttemptResponseDto {
        return {
            id: payment.id,
            payment_number: payment.payment_number,
            order_id: payment.order_id,
            provider: payment.provider,
            status: payment.status,
            request_id: payment.request_id ?? undefined,
            reference_id: payment.reference_id ?? undefined,
            invoice_id: payment.invoice_id ?? undefined,
            provider_status: payment.provider_status ?? undefined,
            provider_response_code: payment.provider_response_code ?? undefined,
            provider_error_code: payment.provider_error_code ?? undefined,
            message,
            paid_at: payment.paid_at ?? undefined,
            can_retry: canRetry,
        };
    }
}
