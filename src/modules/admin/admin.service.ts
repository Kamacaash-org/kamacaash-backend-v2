import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { Payment } from '../payments/entities/payment.entity';
import { AppUser } from '../users/entities/app-user.entity';
import { StaffUser } from '../staff/entities/staff-user.entity';
import { Business } from '../businesses/entities/business.entity';
import { Offer } from '../offers/entities/offer.entity';
import { Review } from '../reviews/entities/review.entity';
import {
    BusinessStatus,
    BusinessVerificationStatus,
    OfferStatus,
    OrderStatus,
    PaymentStatus,
    ReviewStatus,
} from '../../common/entities/enums/all.enums';
import {
    AdminDashboardFinanceDto,
    AdminDashboardOperationsDto,
    AdminDashboardOverviewDto,
    AdminDashboardRecentActivityDto,
    AdminDashboardStatsDto,
} from './dto/admin-dashboard-response.dto';

@Injectable()
export class AdminService {
    constructor(
        @InjectRepository(Order)
        private readonly ordersRepository: Repository<Order>,
        @InjectRepository(Payment)
        private readonly paymentsRepository: Repository<Payment>,
        @InjectRepository(AppUser)
        private readonly usersRepository: Repository<AppUser>,
        @InjectRepository(StaffUser)
        private readonly staffRepository: Repository<StaffUser>,
        @InjectRepository(Business)
        private readonly businessesRepository: Repository<Business>,
        @InjectRepository(Offer)
        private readonly offersRepository: Repository<Offer>,
        @InjectRepository(Review)
        private readonly reviewsRepository: Repository<Review>,
    ) { }

    async getDashboardStats(): Promise<AdminDashboardStatsDto> {
        const [overview, finance, operations, recent_activity] = await Promise.all([
            this.getOverview(),
            this.getFinance(),
            this.getOperations(),
            this.getRecentActivity(),
        ]);

        return {
            overview,
            finance,
            operations,
            recent_activity,
        };
    }

    async getOverview(): Promise<AdminDashboardOverviewDto> {
        const [
            total_users,
            total_staff,
            total_businesses,
            total_offers,
            total_orders,
            active_businesses,
            published_offers,
        ] = await Promise.all([
            this.usersRepository.count(),
            this.staffRepository.count({ where: { is_archived: false } }),
            this.businessesRepository.count({ where: { is_archived: false } }),
            this.offersRepository.count({ where: { is_archived: false } }),
            this.ordersRepository.count(),
            this.businessesRepository.count({
                where: {
                    is_archived: false,
                    status: BusinessStatus.ACTIVE,
                },
            }),
            this.offersRepository.count({
                where: {
                    is_archived: false,
                    status: OfferStatus.PUBLISHED,
                },
            }),
        ]);

        return {
            total_users,
            total_staff,
            total_businesses,
            total_offers,
            total_orders,
            active_businesses,
            published_offers,
        };
    }

    async getFinance(): Promise<AdminDashboardFinanceDto> {
        const todayStart = this.getUtcDayStart(new Date());
        const monthStart = new Date();
        monthStart.setUTCDate(1);
        monthStart.setUTCHours(0, 0, 0, 0);

        const totals = await this.paymentsRepository
            .createQueryBuilder('payment')
            .select(
                'COUNT(CASE WHEN payment.status = :confirmedStatus THEN 1 END)',
                'confirmed_payments',
            )
            .addSelect(
                'COALESCE(SUM(CASE WHEN payment.status = :confirmedStatus THEN payment.amount_minor ELSE 0 END), 0)',
                'total_revenue_minor',
            )
            .addSelect(
                'COALESCE(SUM(CASE WHEN payment.status = :confirmedStatus THEN payment.platform_fee_minor ELSE 0 END), 0)',
                'total_platform_fees_minor',
            )
            .addSelect(
                'COALESCE(SUM(CASE WHEN payment.status = :confirmedStatus THEN payment.business_payout_minor ELSE 0 END), 0)',
                'total_business_payout_minor',
            )
            .addSelect(
                'COALESCE(SUM(CASE WHEN payment.status = :confirmedStatus AND payment.created_at >= :todayStart THEN payment.amount_minor ELSE 0 END), 0)',
                'today_revenue_minor',
            )
            .addSelect(
                'COALESCE(SUM(CASE WHEN payment.status = :confirmedStatus AND payment.created_at >= :monthStart THEN payment.amount_minor ELSE 0 END), 0)',
                'month_revenue_minor',
            )
            .setParameters({
                confirmedStatus: PaymentStatus.CONFIRMED,
                todayStart,
                monthStart,
            })
            .getRawOne<{
                confirmed_payments: string;
                total_revenue_minor: string;
                total_platform_fees_minor: string;
                total_business_payout_minor: string;
                today_revenue_minor: string;
                month_revenue_minor: string;
            }>();

        return {
            confirmed_payments: Number(totals?.confirmed_payments ?? 0),
            total_revenue_minor: Number(totals?.total_revenue_minor ?? 0),
            total_platform_fees_minor: Number(totals?.total_platform_fees_minor ?? 0),
            total_business_payout_minor: Number(totals?.total_business_payout_minor ?? 0),
            today_revenue_minor: Number(totals?.today_revenue_minor ?? 0),
            month_revenue_minor: Number(totals?.month_revenue_minor ?? 0),
        };
    }

    async getOperations(): Promise<AdminDashboardOperationsDto> {
        const [
            pending_business_verifications,
            pending_staff_approvals,
            pending_reviews,
            cancelled_orders,
            no_show_orders,
        ] = await Promise.all([
            this.businessesRepository.count({
                where: {
                    is_archived: false,
                    verification_status: BusinessVerificationStatus.PENDING,
                },
            }),
            this.staffRepository.count({
                where: {
                    is_archived: false,
                    is_admin_approved: false,
                },
            }),
            this.reviewsRepository.count({
                where: {
                    status: ReviewStatus.PENDING,
                },
            }),
            this.ordersRepository.count({
                where: {
                    status: OrderStatus.CANCELLED_BY_ADMIN,
                },
            }),
            this.ordersRepository.count({
                where: {
                    status: OrderStatus.NO_SHOW,
                },
            }),
        ]);

        return {
            pending_business_verifications,
            pending_staff_approvals,
            pending_reviews,
            cancelled_orders,
            no_show_orders,
        };
    }

    async getRecentActivity(): Promise<AdminDashboardRecentActivityDto> {
        const [recent_orders, recent_payments, recent_businesses] = await Promise.all([
            this.ordersRepository
                .createQueryBuilder('ord')
                .leftJoin('ord.business', 'business')
                .leftJoin('ord.user', 'user')
                .select([
                    'ord.id AS id',
                    'ord.order_number AS order_number',
                    'ord.status AS status',
                    'ord.total_amount_minor AS total_amount_minor',
                    'ord.created_at AS created_at',
                    'business.display_name AS business_name',
                    `TRIM(COALESCE(user.first_name, '') || ' ' || COALESCE(user.last_name, '')) AS customer_name`,
                ])
                .orderBy('ord.created_at', 'DESC')
                .take(5)
                .getRawMany(),
            this.paymentsRepository
                .createQueryBuilder('payment')
                .leftJoin('payment.business', 'business')
                .select([
                    'payment.id AS id',
                    'payment.payment_number AS payment_number',
                    'payment.amount_minor AS amount_minor',
                    'payment.status AS status',
                    'payment.created_at AS created_at',
                    'business.display_name AS business_name',
                ])
                .orderBy('payment.created_at', 'DESC')
                .take(5)
                .getRawMany(),
            this.businessesRepository
                .createQueryBuilder('business')
                .select([
                    'business.id AS id',
                    'business.display_name AS display_name',
                    'business.verification_status AS verification_status',
                    'business.created_at AS created_at',
                ])
                .where('business.is_archived = :isArchived', { isArchived: false })
                .orderBy('business.created_at', 'DESC')
                .take(5)
                .getRawMany(),
        ]);

        return {
            recent_orders: recent_orders.map((row) => ({
                id: row.id,
                order_number: row.order_number,
                business_name: row.business_name ?? undefined,
                customer_name: row.customer_name?.trim() || undefined,
                status: row.status,
                total_amount_minor: Number(row.total_amount_minor ?? 0),
                created_at: new Date(row.created_at),
            })),
            recent_payments: recent_payments.map((row) => ({
                id: row.id,
                payment_number: row.payment_number,
                business_name: row.business_name ?? undefined,
                amount_minor: Number(row.amount_minor ?? 0),
                status: row.status,
                created_at: new Date(row.created_at),
            })),
            recent_businesses: recent_businesses.map((row) => ({
                id: row.id,
                display_name: row.display_name,
                verification_status: row.verification_status,
                created_at: new Date(row.created_at),
            })),
        };
    }

    private getUtcDayStart(date: Date): Date {
        return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    }
}
