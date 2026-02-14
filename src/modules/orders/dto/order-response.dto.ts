import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus, PaymentStatus } from '../../../common/entities/enums/all.enums';
import { Order } from '../entities/order.entity';

export class OrderResponseDto {
  @ApiProperty()
  id: string;
  @ApiProperty()
  order_number: string;
  @ApiProperty()
  pickup_code: string;
  @ApiProperty()
  user_id: string;
  @ApiProperty()
  business_id: string;
  @ApiProperty()
  offer_id: string;
  @ApiProperty()
  quantity: number;
  @ApiProperty()
  unit_price_minor: number;
  @ApiProperty()
  subtotal_minor: number;
  @ApiProperty()
  tax_minor: number;
  @ApiProperty()
  discount_minor: number;
  @ApiProperty()
  total_amount_minor: number;
  @ApiProperty()
  currency_code: string;
  @ApiProperty({ enum: OrderStatus })
  status: OrderStatus;
  @ApiProperty({ enum: PaymentStatus })
  payment_status: PaymentStatus;
  @ApiPropertyOptional()
  hold_expires_at?: Date;
  @ApiPropertyOptional()
  pickup_time?: Date;
  @ApiPropertyOptional()
  business_timezone?: string;
  @ApiPropertyOptional()
  hold_expires_at_local?: string;
  @ApiPropertyOptional()
  pickup_time_local?: string;
  @ApiProperty()
  created_at: Date;

  private static toLocal(date: Date | null | undefined, timezone?: string): string | undefined {
    if (!date || !timezone) return undefined;
    return new Intl.DateTimeFormat('sv-SE', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date);
  }

  static fromEntity(order: Order): OrderResponseDto {
    const timezone = (order as any).business?.timezone;
    return {
      id: order.id,
      order_number: order.order_number,
      pickup_code: order.pickup_code,
      user_id: order.user_id,
      business_id: order.business_id,
      offer_id: order.offer_id,
      quantity: order.quantity,
      unit_price_minor: order.unit_price_minor,
      subtotal_minor: order.subtotal_minor,
      tax_minor: order.tax_minor,
      discount_minor: order.discount_minor,
      total_amount_minor: order.total_amount_minor,
      currency_code: order.currency_code,
      status: order.status,
      payment_status: order.payment_status,
      hold_expires_at: order.hold_expires_at,
      pickup_time: order.pickup_time,
      business_timezone: timezone,
      hold_expires_at_local: OrderResponseDto.toLocal(order.hold_expires_at, timezone),
      pickup_time_local: OrderResponseDto.toLocal(order.pickup_time, timezone),
      created_at: order.created_at,
    };
  }
}
