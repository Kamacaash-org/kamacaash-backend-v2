import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { Order } from '../orders/entities/order.entity';
import { ReviewStatus, OrderStatus } from '../../common/entities/enums/all.enums';
import { CreateReviewDto } from './dto/create-review.dto';
import { QueryReviewsDto } from './dto/query-reviews.dto';

@Injectable()
export class ReviewsService {
    constructor(
        @InjectRepository(Review)
        private reviewsRepository: Repository<Review>,
        @InjectRepository(Order)
        private ordersRepository: Repository<Order>,
    ) { }

    async create(createReviewDto: CreateReviewDto, userId: string): Promise<Review> {
        const { order_id, rating, comment } = createReviewDto;

        const order = await this.ordersRepository.findOne({ where: { id: order_id, user_id: userId } });
        if (!order) throw new NotFoundException('Order not found');

        if (order.status !== OrderStatus.COLLECTED) {
            throw new BadRequestException('Can only review collected orders');
        }

        const existing = await this.reviewsRepository.findOne({ where: { order_id } });
        if (existing) throw new BadRequestException('Order already reviewed');

        const review = this.reviewsRepository.create({
            user_id: userId,
            order_id,
            business_id: order.business_id,
            offer_id: order.offer_id,
            rating,
            comment,
            status: ReviewStatus.PENDING,
        });

        const saved = await this.reviewsRepository.save(review);
        order.has_user_reviewed = true;
        await this.ordersRepository.save(order);

        return saved;
    }

    async findAll(queryParams: QueryReviewsDto): Promise<Review[]> {
        const where: any = { is_visible: true, status: ReviewStatus.APPROVED };
        if (queryParams.business_id) where.business_id = queryParams.business_id;
        if (queryParams.offer_id) where.offer_id = queryParams.offer_id;

        return this.reviewsRepository.find({
            where,
            relations: ['user'],
            order: { created_at: 'DESC' },
        });
    }
}
