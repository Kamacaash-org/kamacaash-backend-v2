import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminDashboardOverviewDto {
    @ApiProperty()
    total_users!: number;

    @ApiProperty()
    total_staff!: number;

    @ApiProperty()
    total_businesses!: number;

    @ApiProperty()
    total_offers!: number;

    @ApiProperty()
    total_orders!: number;

    @ApiProperty()
    active_businesses!: number;

    @ApiProperty()
    published_offers!: number;
}

export class AdminDashboardFinanceDto {
    @ApiProperty()
    confirmed_payments!: number;

    @ApiProperty()
    total_revenue_minor!: number;

    @ApiProperty()
    total_platform_fees_minor!: number;

    @ApiProperty()
    total_business_payout_minor!: number;

    @ApiProperty()
    today_revenue_minor!: number;

    @ApiProperty()
    month_revenue_minor!: number;
}

export class AdminDashboardOperationsDto {
    @ApiProperty()
    pending_business_verifications!: number;

    @ApiProperty()
    pending_staff_approvals!: number;

    @ApiProperty()
    pending_reviews!: number;

    @ApiProperty()
    cancelled_orders!: number;

    @ApiProperty()
    no_show_orders!: number;
}

export class AdminDashboardRecentOrderDto {
    @ApiProperty()
    id!: string;

    @ApiProperty()
    order_number!: string;

    @ApiPropertyOptional()
    business_name?: string;

    @ApiPropertyOptional()
    customer_name?: string;

    @ApiProperty()
    status!: string;

    @ApiProperty()
    total_amount_minor!: number;

    @ApiProperty()
    created_at!: Date;
}

export class AdminDashboardRecentPaymentDto {
    @ApiProperty()
    id!: string;

    @ApiProperty()
    payment_number!: string;

    @ApiPropertyOptional()
    business_name?: string;

    @ApiProperty()
    amount_minor!: number;

    @ApiProperty()
    status!: string;

    @ApiProperty()
    created_at!: Date;
}

export class AdminDashboardRecentBusinessDto {
    @ApiProperty()
    id!: string;

    @ApiProperty()
    display_name!: string;

    @ApiProperty()
    verification_status!: string;

    @ApiProperty()
    created_at!: Date;
}

export class AdminDashboardRecentActivityDto {
    @ApiProperty({ type: [AdminDashboardRecentOrderDto] })
    recent_orders!: AdminDashboardRecentOrderDto[];

    @ApiProperty({ type: [AdminDashboardRecentPaymentDto] })
    recent_payments!: AdminDashboardRecentPaymentDto[];

    @ApiProperty({ type: [AdminDashboardRecentBusinessDto] })
    recent_businesses!: AdminDashboardRecentBusinessDto[];
}

export class AdminDashboardStatsDto {
    @ApiProperty({ type: AdminDashboardOverviewDto })
    overview!: AdminDashboardOverviewDto;

    @ApiProperty({ type: AdminDashboardFinanceDto })
    finance!: AdminDashboardFinanceDto;

    @ApiProperty({ type: AdminDashboardOperationsDto })
    operations!: AdminDashboardOperationsDto;

    @ApiProperty({ type: AdminDashboardRecentActivityDto })
    recent_activity!: AdminDashboardRecentActivityDto;
}
