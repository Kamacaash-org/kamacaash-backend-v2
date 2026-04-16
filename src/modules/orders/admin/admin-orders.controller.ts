import { Body, Controller, Get, Param, Patch, Request, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApiResponseDto } from '../../../common/dto/api-response.dto';
import { OrdersService } from '../orders.service';
import { AdminCancelOrderDto } from '../dto/admin-cancel-order.dto';
import { AdminCompleteOrderDto } from '../dto/admin-complete-order.dto';
import { AdminOrderResponseDto } from '../dto/admin-order-response.dto';

@ApiTags('admin/orders')
@Controller('admin/orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('business/:businessId/pending/today')
  @ApiOperation({ summary: 'Get today pending orders by business ID' })
  @ApiParam({ name: 'businessId', description: 'Business id' })
  @ApiOkResponse({ type: AdminOrderResponseDto, isArray: true })
  getTodayPendingOrdersByBusiness(
    @Param('businessId') businessId: string,
  ): Promise<ApiResponseDto<AdminOrderResponseDto[]>> {
    return this.ordersService.getTodayPendingOrdersByBusiness(businessId);
  }

  @Get('business/:businessId/completed/today')
  @ApiOperation({ summary: 'Get today completed orders by business ID' })
  @ApiParam({ name: 'businessId', description: 'Business id' })
  @ApiOkResponse({ type: AdminOrderResponseDto, isArray: true })
  getTodayCompletedOrdersByBusiness(
    @Param('businessId') businessId: string,
  ): Promise<ApiResponseDto<AdminOrderResponseDto[]>> {
    return this.ordersService.getTodayCompletedOrdersByBusiness(businessId);
  }

  @Get('business/:businessId/cancelled/today')
  @ApiOperation({ summary: 'Get today cancelled orders by business ID' })
  @ApiParam({ name: 'businessId', description: 'Business id' })
  @ApiOkResponse({ type: AdminOrderResponseDto, isArray: true })
  getTodayCancelledOrdersByBusiness(
    @Param('businessId') businessId: string,
  ): Promise<ApiResponseDto<AdminOrderResponseDto[]>> {
    return this.ordersService.getTodayCancelledOrdersByBusiness(businessId);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel order with reason and simple refund handling' })
  @ApiParam({ name: 'id', description: 'Order id' })
  @ApiOkResponse({ type: AdminOrderResponseDto })
  cancelOrder(
    @Param('id') id: string,
    @Body() adminCancelOrderDto: AdminCancelOrderDto,
    @Request() req,
  ): Promise<ApiResponseDto<AdminOrderResponseDto>> {
    return this.ordersService.adminCancelOrder(id, adminCancelOrderDto, req.user);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Complete order after validating customer pin code' })
  @ApiParam({ name: 'id', description: 'Order id' })
  @ApiOkResponse({ type: AdminOrderResponseDto })
  completeOrder(
    @Param('id') id: string,
    @Body() adminCompleteOrderDto: AdminCompleteOrderDto,
    @Request() req,
  ): Promise<ApiResponseDto<AdminOrderResponseDto>> {
    return this.ordersService.adminCompleteOrder(id, adminCompleteOrderDto, req.user);
  }
}
