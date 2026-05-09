import { Controller, Post, Body, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { QueryReviewsDto } from './dto/query-reviews.dto';
import { ReviewResponseDto } from './dto/review-response.dto';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
    constructor(private readonly reviewsService: ReviewsService) { }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Post()
    @ApiOperation({ summary: 'Create review' })
    async create(@Body() createReviewDto: CreateReviewDto, @Request() req): Promise<ApiResponseDto<ReviewResponseDto>> {
        const review = await this.reviewsService.create(createReviewDto, req.user.id);
        return ApiResponseDto.success('Review submitted successfully', ReviewResponseDto.fromEntity(review));
    }

    @Get()
    @ApiOperation({ summary: 'List reviews' })
    @ApiQuery({ name: 'business_id', required: false })
    @ApiQuery({ name: 'offer_id', required: false })
    async findAll(@Query() queryParams: QueryReviewsDto): Promise<ApiResponseDto<ReviewResponseDto[]>> {
        const reviews = await this.reviewsService.findAll(queryParams);
        return ApiResponseDto.success(
            'Reviews fetched successfully',
            reviews.map((review) => ReviewResponseDto.fromEntity(review)),
        );
    }
}
