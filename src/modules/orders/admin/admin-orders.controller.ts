import { Body, Controller, Get, Param, Patch, Query, Request, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApiResponseDto } from '../../../common/dto/api-response.dto';
import { OrdersService } from '../orders.service';
import { AdminCancelOrderDto } from '../dto/admin-cancel-order.dto';
import { AdminCompleteOrderDto } from '../dto/admin-complete-order.dto';
import { AdminOrderResponseDto } from '../dto/admin-order-response.dto';
import { AdminCloseNoShowOrderDto } from '../dto/admin-close-no-show-order.dto';

@ApiTags('admin/orders')
@Controller('admin/orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  @Get('business/:businessId/pending/today')
  @ApiOperation({ summary: 'Get today pending orders by business ID' })
  @ApiParam({ name: 'businessId', description: 'Business id' })
  @ApiOkResponse({ type: AdminOrderResponseDto, isArray: true })
  getTodayPendingOrdersByBusiness(
    @Param('businessId') businessId: string,
  ): Promise<ApiResponseDto<AdminOrderResponseDto[]>> {
    return this.ordersService.getTodayPendingOrdersByBusiness(businessId);
  }

  @Get('business/:businessId/completed')
  @ApiOperation({ summary: 'Get today completed orders by business ID' })
  @ApiParam({ name: 'businessId', description: 'Business id' })
  @ApiQuery({ name: 'start', required: false, description: 'Optional start date/datetime filter' })
  @ApiQuery({ name: 'end', required: false, description: 'Optional end date/datetime filter' })
  @ApiOkResponse({ type: AdminOrderResponseDto, isArray: true })
  getTodayCompletedOrdersByBusiness(
    @Param('businessId') businessId: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ): Promise<ApiResponseDto<AdminOrderResponseDto[]>> {
    return this.ordersService.getCompletedOrdersByBusiness(businessId, start, end);
  }

  @Get('business/:businessId/cancelled')
  @ApiOperation({ summary: 'Get today cancelled orders by business ID' })
  @ApiParam({ name: 'businessId', description: 'Business id' })
  @ApiQuery({ name: 'start', required: false, description: 'Optional start date/datetime filter' })
  @ApiQuery({ name: 'end', required: false, description: 'Optional end date/datetime filter' })
  @ApiOkResponse({ type: AdminOrderResponseDto, isArray: true })
  getTodayCancelledOrdersByBusiness(
    @Param('businessId') businessId: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ): Promise<ApiResponseDto<AdminOrderResponseDto[]>> {
    return this.ordersService.getCancelledOrdersByBusiness(businessId, start, end);
  }

  @Get('business/:businessId/no-show')
  @ApiOperation({ summary: 'Get today no-show orders by business ID' })
  @ApiParam({ name: 'businessId', description: 'Business id' })
  @ApiQuery({ name: 'start', required: false, description: 'Optional start date/datetime filter' })
  @ApiQuery({ name: 'end', required: false, description: 'Optional end date/datetime filter' })
  @ApiOkResponse({ type: AdminOrderResponseDto, isArray: true })
  getTodayNoShowOrdersByBusiness(
    @Param('businessId') businessId: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ): Promise<ApiResponseDto<AdminOrderResponseDto[]>> {
    return this.ordersService.getNoShowOrdersByBusiness(businessId, start, end);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel order with reason and simple refund handling' })
  @ApiParam({ name: 'id', description: 'Order id' })
  @ApiOkResponse({ type: AdminOrderResponseDto })
  cancelOrder(
    @Param('id') id: string,
    @Body() adminCancelOrderDto: AdminCancelOrderDto,
    @Request() req,
  ): Promise<ApiResponseDto<null>> {
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
  ): Promise<ApiResponseDto<null>> {
    return this.ordersService.adminCompleteOrder(id, adminCompleteOrderDto, req.user);
  }

  @Patch(':id/no-show/close')
  @ApiOperation({ summary: 'Close a no-show order, optionally restoring quantity to the offer' })
  @ApiParam({ name: 'id', description: 'Order id' })
  @ApiOkResponse({ type: AdminOrderResponseDto })
  closeNoShowOrder(
    @Param('id') id: string,
    @Body() adminCloseNoShowOrderDto: AdminCloseNoShowOrderDto,
    @Request() req,
  ): Promise<ApiResponseDto<null>> {
    return this.ordersService.adminCloseNoShowOrder(id, adminCloseNoShowOrderDto, req.user);
  }
}
