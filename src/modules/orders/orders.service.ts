import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Order } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { Offer } from '../offers/entities/offer.entity';
import { AppUser } from '../users/entities/app-user.entity';
import { OrderStatus, OfferStatus } from '../../common/entities/enums/all.enums';
import { ConfigService } from '@nestjs/config';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { DEFAULT_MESSAGES } from '../../common/constants/default-messages';
import { OrderResponseDto } from './dto/order-response.dto';

@Injectable()
export class OrdersService {
    constructor(
        @InjectRepository(Order)
        private ordersRepository: Repository<Order>,
        private dataSource: DataSource,
        private configService: ConfigService,
    ) { }

    async create(createOrderDto: CreateOrderDto, user: AppUser): Promise<ApiResponseDto<OrderResponseDto>> {
        const { offer_id, quantity, pickup_time } = createOrderDto;

        const created = await this.dataSource.transaction(async (manager: EntityManager) => {
            const offer = await manager.findOne(Offer, {
                where: { id: offer_id },
                lock: { mode: 'pessimistic_write' },
                relations: ['business'],
            });

            if (!offer) {
                throw new NotFoundException(`${DEFAULT_MESSAGES.OFFER.NOT_FOUND}: ${offer_id}`);
            }

            if (offer.status !== OfferStatus.PUBLISHED || !offer.is_active) {
                throw new BadRequestException(DEFAULT_MESSAGES.OFFER.INACTIVE);
            }

            if (offer.quantity_remaining < quantity) {
                throw new ConflictException(DEFAULT_MESSAGES.ORDER.INSUFFICIENT_QUANTITY);
            }

            const candidatePickupTime = pickup_time ? new Date(pickup_time) : offer.pickup_start;
            if (candidatePickupTime < offer.pickup_start || candidatePickupTime > offer.pickup_end) {
                throw new BadRequestException(DEFAULT_MESSAGES.OFFER.INVALID_PICKUP_WINDOW);
            }

            offer.quantity_remaining -= quantity;
            offer.quantity_reserved += quantity;
            await manager.save(offer);

            const holdDurationMinutes = this.configService.get<number>('ORDER_HOLD_MINUTES') || 15;
            const holdExpiresAt = new Date(Date.now() + holdDurationMinutes * 60 * 1000);

            const order = manager.create(Order, {
                order_number: this.generateOrderNumber(),
                pickup_code: this.generatePickupCode(),
                user_id: user.id,
                business_id: offer.business_id,
                offer_id: offer.id,
                quantity,
                unit_price_minor: offer.offer_price_minor,
                start_price_minor: offer.original_price_minor,
                subtotal_minor: quantity * offer.offer_price_minor,
                total_amount_minor: quantity * offer.offer_price_minor,
                currency_code: offer.business?.currency_code || offer.currency_code,
                status: OrderStatus.HOLD,
                hold_expires_at: holdExpiresAt,
                pickup_time: candidatePickupTime,
            });

            return manager.save(Order, order);
        });

        const withRelations = await this.ordersRepository.findOne({
            where: { id: created.id },
            relations: ['offer', 'business'],
        });
        if (!withRelations) throw new NotFoundException(`${DEFAULT_MESSAGES.ORDER.NOT_FOUND}: ${created.id}`);

        return ApiResponseDto.success(DEFAULT_MESSAGES.ORDER.CREATED, OrderResponseDto.fromEntity(withRelations));
    }

    generateOrderNumber(): string {
        return `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }

    generatePickupCode(): string {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    async findAll(userId: string): Promise<ApiResponseDto<OrderResponseDto[]>> {
        const orders = await this.ordersRepository.find({
            where: { user_id: userId },
            relations: ['offer', 'business'],
            order: { created_at: 'DESC' },
        });

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.ORDER.LIST_FETCHED,
            orders.map((order) => OrderResponseDto.fromEntity(order)),
        );
    }

    async findOne(id: string, userId: string): Promise<ApiResponseDto<OrderResponseDto>> {
        const order = await this.ordersRepository.findOne({
            where: { id, user_id: userId },
            relations: ['offer', 'business'],
        });
        if (!order) throw new NotFoundException(`${DEFAULT_MESSAGES.ORDER.NOT_FOUND}: ${id}`);

        return ApiResponseDto.success(DEFAULT_MESSAGES.ORDER.FETCHED, OrderResponseDto.fromEntity(order));
    }
}
