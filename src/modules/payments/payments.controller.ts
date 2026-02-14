import { Controller, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Post('initialize/:orderId')
    @ApiOperation({ summary: 'Initialize payment for order' })
    initialize(@Param('orderId') orderId: string, @Body('provider') provider: string, @Request() req) {
        return this.paymentsService.initializePayment(orderId, req.user.id, provider);
    }

    @Post('webhook')
    @ApiOperation({ summary: 'Payment gateway webhook' })
    webhook(@Body() payload: any) {
        return this.paymentsService.handleWebhook(payload);
    }
}
