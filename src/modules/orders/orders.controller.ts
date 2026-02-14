import { Controller, Post, Body, Get, Param, UseGuards, Request } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { OrderResponseDto } from './dto/order-response.dto';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @Post()
    @ApiOperation({ summary: 'Create order (Reserve offer)' })
    create(@Body() createOrderDto: CreateOrderDto, @Request() req): Promise<ApiResponseDto<OrderResponseDto>> {
        return this.ordersService.create(createOrderDto, req.user);
    }

    @Get()
    @ApiOperation({ summary: 'List user orders' })
    findAll(@Request() req): Promise<ApiResponseDto<OrderResponseDto[]>> {
        return this.ordersService.findAll(req.user.id);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get order details' })
    findOne(@Param('id') id: string, @Request() req): Promise<ApiResponseDto<OrderResponseDto>> {
        return this.ordersService.findOne(id, req.user.id);
    }
}
