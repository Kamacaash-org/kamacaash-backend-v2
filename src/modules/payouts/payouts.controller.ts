import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { PayoutsService } from './payouts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('payouts')
@Controller('payouts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PayoutsController {
    constructor(private readonly payoutsService: PayoutsService) { }

    @Get()
    @ApiOperation({ summary: 'List payouts (Business/Admin)' })
    findAll(@Query('business_id') businessId?: string) {
        return this.payoutsService.findAll(businessId);
    }
}
