import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiResponseDto } from '../../../common/dto/api-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OrdersService } from '../orders.service';
import { CancelOrderReservationDto } from '../dto/cancel-order-reservation.dto';
import { CreateOrderDto } from '../dto/create-order.dto';
import { MarkOrderPaidDto } from '../dto/mark-order-paid.dto';
import { MobileUserOrderDto, OrderResponseDto } from '../dto/order-response.dto';

@ApiTags('app/orders')
@Controller('app/orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AppOrdersController {
    constructor(private readonly ordersService: OrdersService) { }


    @Post('reserve')
    @ApiOperation({ summary: 'Reserve offer and hold order for 5 minutes' })
    @ApiOkResponse({ type: OrderResponseDto })
    reserve(@Body() createOrderDto: CreateOrderDto, @Request() req): Promise<ApiResponseDto<OrderResponseDto>> {
        return this.ordersService.reserve(createOrderDto, req.user);
    }

    @Patch(':id/paid')
    @ApiOperation({ summary: 'Mark held order as paid after successful payment' })
    @ApiParam({ name: 'id', description: 'Order id' })
    @ApiOkResponse({ type: OrderResponseDto })
    markPaid(
        @Param('id') id: string,
        @Body() markOrderPaidDto: MarkOrderPaidDto,
        @Request() req,
    ): Promise<ApiResponseDto<OrderResponseDto>> {
        return this.ordersService.markPaid(id, req.user.id, markOrderPaidDto);
    }

    @Patch(':id/cancel-reservation')
    @ApiOperation({ summary: 'Cancel active order reservation and restore held quantity' })
    @ApiParam({ name: 'id', description: 'Order id' })
    @ApiOkResponse({ type: OrderResponseDto })
    cancelReservation(
        @Param('id') id: string,
        @Body() cancelOrderReservationDto: CancelOrderReservationDto,
        @Request() req,
    ): Promise<ApiResponseDto<OrderResponseDto>> {
        return this.ordersService.cancelReservation(id, req.user.id, cancelOrderReservationDto);
    }

    @Get()
    @ApiOperation({ summary: 'List user orders (mobile)' })
    findAll(@Request() req): Promise<ApiResponseDto<MobileUserOrderDto[]>> {
        return this.ordersService.findAll(req.user.id);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get order details' })
    findOne(@Param('id') id: string, @Request() req): Promise<ApiResponseDto<OrderResponseDto>> {
        return this.ordersService.findOne(id, req.user.id);
    }
}
