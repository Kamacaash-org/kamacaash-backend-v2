import { Body, Controller, Param, Post, Request, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { InitiatePushPaymentDto } from './dto/initiate-push-payment.dto';
import { PaymentAttemptResponseDto } from './dto/payment-attempt-response.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Post('initialize/:orderId')
    @ApiOperation({ summary: 'Initialize WAAFI push payment for order' })
    @ApiOkResponse({ type: PaymentAttemptResponseDto })
    initialize(
        @Param('orderId') orderId: string,
        @Body() initiatePushPaymentDto: InitiatePushPaymentDto,
        @Request() req,
    ): Promise<ApiResponseDto<PaymentAttemptResponseDto>> {
        return this.paymentsService.initializePayment(orderId, req.user.id, initiatePushPaymentDto);
    }

    @Post('webhook')
    @ApiOperation({ summary: 'Payment gateway webhook' })
    webhook(@Body() payload: any) {
        return this.paymentsService.handleWebhook(payload);
    }
}
