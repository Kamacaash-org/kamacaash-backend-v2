import { Controller, Post, Body, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
    constructor(private readonly reviewsService: ReviewsService) { }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Post()
    @ApiOperation({ summary: 'Create review' })
    create(@Body() createReviewDto: any, @Request() req) {
        return this.reviewsService.create(createReviewDto, req.user.id);
    }

    @Get()
    @ApiOperation({ summary: 'List reviews' })
    @ApiQuery({ name: 'business_id', required: false })
    @ApiQuery({ name: 'offer_id', required: false })
    findAll(@Query() queryParams: any) {
        return this.reviewsService.findAll(queryParams);
    }
}
