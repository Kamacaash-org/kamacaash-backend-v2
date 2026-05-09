import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReviewStatus } from '../../../common/entities/enums/all.enums';
import { Review } from '../entities/review.entity';

export class ReviewResponseDto {
    @ApiProperty()
    id!: string;

    @ApiProperty()
    orderId!: string;

    @ApiProperty()
    userId!: string;

    @ApiProperty()
    businessId!: string;

    @ApiPropertyOptional()
    offerId?: string | null;

    @ApiProperty()
    rating!: number;

    @ApiPropertyOptional()
    comment?: string | null;

    @ApiProperty({ enum: ReviewStatus })
    status!: ReviewStatus;

    @ApiProperty()
    createdAt!: string;

    static fromEntity(review: Review): ReviewResponseDto {
        return {
            id: review.id,
            orderId: review.order_id,
            userId: review.user_id,
            businessId: review.business_id,
            offerId: review.offer_id ?? null,
            rating: review.rating,
            comment: review.comment ?? null,
            status: review.status,
            createdAt: review.created_at.toISOString(),
        };
    }
}
