import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
  UseGuards,
  Request,
  SetMetadata,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { Review } from './entity/review.entity';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);


@ApiTags('store')
@Controller('store')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Public()
  @Post('product/review')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a product review',
    description: 'Create a review for a product. The order must be delivered to allow review creation. Only one review per order is allowed.',
  })
  @ApiResponse({
    status: 201,
    description: 'Review created successfully',
    type: Review,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Order not delivered, review already exists for this order, or validation errors',
  })
  @ApiResponse({
    status: 404,
    description: 'Order or product not found',
  })
  async createReview(@Body() reviewData: CreateReviewDto): Promise<Review> {
    return await this.reviewService.createReview(reviewData);
  }

  @Get('product/review/:productId')
  @ApiOperation({
    summary: 'Get reviews for a product',
    description: 'Retrieve all reviews for a specific product.',
  })
  @ApiParam({
    name: 'productId',
    required: true,
    description: 'Product ID to get reviews for.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reviews retrieved successfully',
    type: [Review],
  })
  async getProductReviews(
    @Param('productId', ParseIntPipe) productId: number,
  ): Promise<Review[]> {
    return await this.reviewService.findReviewsByProductId(productId);
  }

  @Get('business/review/:businessId')
  @ApiOperation({
    summary: 'Get reviews for a business',
    description: 'Retrieve all reviews for a specific business.',
  })
  @ApiParam({
    name: 'businessId',
    required: true,
    description: 'Business ID to get reviews for.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reviews retrieved successfully',
    type: [Review],
  })
  async getBusinessReviews(
    @Param('businessId', ParseIntPipe) businessId: number,
  ): Promise<Review[]> {
    return await this.reviewService.findReviewsByBusinessId(businessId);
  }

  @Get('product/review/:id')
  @ApiOperation({
    summary: 'Get a specific review by ID',
    description: 'Retrieve a specific review by its ID.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Review ID to retrieve.',
  })
  @ApiResponse({
    status: 200,
    description: 'Review retrieved successfully',
    type: Review,
  })
  @ApiResponse({
    status: 404,
    description: 'Review not found',
  })
  async getReviewById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Review> {
    return await this.reviewService.findReviewById(id);
  }
}
