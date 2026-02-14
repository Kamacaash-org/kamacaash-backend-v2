import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { Order } from '../orders/entities/order.entity';
import { ReviewStatus, OrderStatus } from '../../common/entities/enums/all.enums';

@Injectable()
export class ReviewsService {
    constructor(
        @InjectRepository(Review)
        private reviewsRepository: Repository<Review>,
        @InjectRepository(Order)
        private ordersRepository: Repository<Order>,
    ) { }

    async create(createReviewDto: any, userId: string) {
        const { order_id, rating, comment } = createReviewDto;

        // Check if order exists and belongs to user
        const order = await this.ordersRepository.findOne({ where: { id: order_id, user_id: userId } });
        if (!order) throw new NotFoundException('Order not found');

        // Check if order is completed
        if (order.status !== OrderStatus.COLLECTED) {
            // Ideally only review collected/completed orders
            // throw new BadRequestException('Can only review collected orders');
        }

        // Check if already reviewed
        const existing = await this.reviewsRepository.findOne({ where: { order_id } });
        if (existing) throw new BadRequestException('Order already reviewed');

        const review = this.reviewsRepository.create({
            user_id: userId,
            order_id,
            business_id: order.business_id,
            offer_id: order.offer_id,
            rating,
            comment,
            status: ReviewStatus.PENDING
        });

        return this.reviewsRepository.save(review);
    }

    async findAll(queryParams: any) {
        const where: any = { is_visible: true, status: ReviewStatus.APPROVED };
        if (queryParams.business_id) where.business_id = queryParams.business_id;
        if (queryParams.offer_id) where.offer_id = queryParams.offer_id;

        return this.reviewsRepository.find({
            where,
            relations: ['user'],
            order: { created_at: 'DESC' }
        });
    }
}
