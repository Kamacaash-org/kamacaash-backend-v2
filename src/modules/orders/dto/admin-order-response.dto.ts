import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus, PaymentStatus } from '../../../common/entities/enums/all.enums';
import { Order } from '../entities/order.entity';

class AdminOrderUserSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  full_name?: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  email?: string;
}

class AdminOrderBusinessSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  display_name?: string;

}

class AdminOrderOfferSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  main_image_url?: string;
}

export class AdminOrderResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  order_number!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  unit_price!: number;

  @ApiProperty()
  subtotal!: number;

  @ApiProperty()
  tax_minor?: number;

  @ApiProperty()
  discount!: number;

  @ApiProperty()
  total_amount!: number;


  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty({ enum: PaymentStatus })
  payment_status!: PaymentStatus;

  @ApiPropertyOptional()
  pickup_start_time?: Date;

  @ApiPropertyOptional()
  pickup_end_time?: Date;

  @ApiPropertyOptional()
  cancelled_at?: Date;

  @ApiPropertyOptional()
  collected_at?: Date;

  @ApiPropertyOptional()
  no_show_at?: Date;


  @ApiPropertyOptional()
  timezone?: string;

  @ApiPropertyOptional()
  cancellation_reason?: string;

  @ApiProperty()
  created_at?: Date;

  @ApiPropertyOptional({ type: AdminOrderUserSummaryDto })
  user?: AdminOrderUserSummaryDto;

  @ApiPropertyOptional({ type: AdminOrderBusinessSummaryDto })
  business?: AdminOrderBusinessSummaryDto;

  @ApiPropertyOptional({ type: AdminOrderOfferSummaryDto })
  offer?: AdminOrderOfferSummaryDto;
  @ApiProperty()
  is_urgent!: boolean;

  private static fromMinorUnits(amount: number | null | undefined): number {
    return Number(((amount ?? 0) / 100).toFixed(2));
  }

  private static isWithinNext30Minutes(date?: Date | null): boolean {
    if (!date) return false;

    const now = new Date().getTime();
    const target = new Date(date).getTime();

    const diffMs = target - now;

    return diffMs > 0 && diffMs <= 30 * 60 * 1000;
  }

  static fromEntity(order: Order): AdminOrderResponseDto {
    return {
      id: order.id,
      order_number: order.order_number,
      quantity: order.quantity,
      unit_price: AdminOrderResponseDto.fromMinorUnits(order.unit_price_minor),
      subtotal: AdminOrderResponseDto.fromMinorUnits(order.subtotal_minor),
      tax_minor: AdminOrderResponseDto.fromMinorUnits(order.tax_minor),
      discount: AdminOrderResponseDto.fromMinorUnits(order.discount_minor),
      total_amount: AdminOrderResponseDto.fromMinorUnits(order.total_amount_minor),
      status: order.status,
      payment_status: order.payment_status,
      pickup_start_time: order.offer.pickup_start,
      pickup_end_time: order.offer.pickup_end,
      timezone: order.business.city.country.default_timezone,
      cancelled_at: order.cancelled_at,
      collected_at: order.collected_at,
      no_show_at: order.no_show_at ?? undefined,
      cancellation_reason: order.cancellation_reason,
      created_at: order.created_at,
      is_urgent: AdminOrderResponseDto.isWithinNext30Minutes(order.pickup_time),

      user: order.user
        ? {
          id: order.user.id,
          full_name: `${order.user.first_name} ${order.user.last_name}`.trim(),
          phone: order.user.phone_e164,
          email: order.user.email,
        }
        : undefined,
      business: order.business
        ? {
          id: order.business.id,
          display_name: order.business.display_name
        }
        : undefined,
      offer: order.offer
        ? {
          id: order.offer.id,
          title: order.offer.title,
          main_image_url: order.offer.main_image_url,
        }
        : undefined,
    };
  }
}
