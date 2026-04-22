import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus, PaymentStatus } from '../../../common/entities/enums/all.enums';
import { Order } from '../entities/order.entity';

class AdminOrderUserSummaryDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  full_name?: string;

  @ApiPropertyOptional()
  phone_e164?: string;

  @ApiPropertyOptional()
  email?: string;
}

class AdminOrderBusinessSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  display_name: string;

  @ApiProperty()
  timezone: string;
}

class AdminOrderOfferSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  main_image_url?: string;
}

export class AdminOrderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  order_number: string;

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
  pickup_time?: Date;

  @ApiPropertyOptional()
  cancelled_at?: Date;

  @ApiPropertyOptional()
  collected_at?: Date;

  @ApiPropertyOptional()
  no_show_at?: Date;


  @ApiPropertyOptional()
  cancellation_reason?: string;

  @ApiProperty()
  created_at: Date;

  @ApiPropertyOptional({ type: AdminOrderUserSummaryDto })
  user?: AdminOrderUserSummaryDto;

  @ApiPropertyOptional({ type: AdminOrderBusinessSummaryDto })
  business?: AdminOrderBusinessSummaryDto;

  @ApiPropertyOptional({ type: AdminOrderOfferSummaryDto })
  offer?: AdminOrderOfferSummaryDto;

  private static fromMinorUnits(amount: number | null | undefined): number {
    return Number(((amount ?? 0) / 100).toFixed(2));
  }

  static fromEntity(order: Order): AdminOrderResponseDto {
    return {
      id: order.id,
      order_number: order.order_number,
      user_id: order.user_id,
      business_id: order.business_id,
      offer_id: order.offer_id,
      quantity: order.quantity,
      unit_price_minor: AdminOrderResponseDto.fromMinorUnits(order.unit_price_minor),
      subtotal_minor: AdminOrderResponseDto.fromMinorUnits(order.subtotal_minor),
      tax_minor: AdminOrderResponseDto.fromMinorUnits(order.tax_minor),
      discount_minor: AdminOrderResponseDto.fromMinorUnits(order.discount_minor),
      total_amount_minor: AdminOrderResponseDto.fromMinorUnits(order.total_amount_minor),
      currency_code: order.currency_code ?? '',
      status: order.status,
      payment_status: order.payment_status,
      pickup_time: order.pickup_time,
      cancelled_at: order.cancelled_at,
      collected_at: order.collected_at,
      no_show_at: order.no_show_at ?? undefined,
      cancellation_reason: order.cancellation_reason,
      created_at: order.created_at,
      user: order.user
        ? {
            id: order.user.id,
            full_name: order.user.full_name,
            phone_e164: order.user.phone_e164,
            email: order.user.email,
          }
        : undefined,
      business: order.business
        ? {
            id: order.business.id,
            display_name: order.business.display_name,
            timezone: order.business.timezone,
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
