import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { PaginationDto } from '../../common/queries/dto';
import { CreateReviewDto, ReviewResponseDto, UpdateReviewDto } from './dto/create-review.dto';
import { Review } from './entity/review.entity';
import { ReviewService } from './review.service';



@ApiTags('reviews')
@Controller('reviews')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a product review',
    description: 'Create a review for a product. The order must be delivered to allow review creation. Only one review per order item is allowed.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Review created successfully',
    type: ReviewResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request - Order not delivered, review already exists for this order, or validation errors',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Order or product not found',
  })
  async createReview(
    @Request() req,
    @Body() reviewData: CreateReviewDto
  ): Promise<Review> {
    return await this.reviewService.createReview(req.user.userId, reviewData);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a product review',
    description: 'Update a review that the authenticated user created.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Review ID to update.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Review updated successfully',
    type: ReviewResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Review not found or does not belong to user',
  })
  async updateReview(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: UpdateReviewDto
  ): Promise<Review> {
    return await this.reviewService.updateReview(req.user.userId, id, updateData);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a product review',
    description: 'Delete a review that the authenticated user created.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Review ID to delete.',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Review deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Review not found or does not belong to user',
  })
  async deleteReview(
    @Request() req,
    @Param('id', ParseIntPipe) id: number
  ): Promise<void> {
    return await this.reviewService.deleteReview(req.user.userId, id);
  }

  @Public()
  @Get('product/:productId')
  @ApiOperation({
    summary: 'Get reviews for a product',
    description: 'Retrieve all reviews for a specific product with pagination.',
  })
  @ApiParam({
    name: 'productId',
    required: true,
    description: 'Product ID to get reviews for.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reviews retrieved successfully',
    type: [ReviewResponseDto],
  })
  async getProductReviews(
    @Param('productId', ParseIntPipe) productId: number,
    @Query() paginationDto: PaginationDto,
  ) {
    return await this.reviewService.findReviewsByProductId(productId, paginationDto);
  }

  @Public()
  @Get('business/:businessId')
  @ApiOperation({
    summary: 'Get reviews for a business',
    description: 'Retrieve all reviews for a specific business with pagination.',
  })
  @ApiParam({
    name: 'businessId',
    required: true,
    description: 'Business ID to get reviews for.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reviews retrieved successfully',
    type: [ReviewResponseDto],
  })
  async getBusinessReviews(
    @Param('businessId', ParseIntPipe) businessId: number,
    @Query() paginationDto: PaginationDto,
  ) {
    return await this.reviewService.findReviewsByBusinessId(businessId, paginationDto);
  }

  @Public()
  @Get('product/:productId/stats')
  @ApiOperation({
    summary: 'Get review statistics for a product',
    description: 'Retrieve review statistics including average rating and rating distribution.',
  })
  @ApiParam({
    name: 'productId',
    required: true,
    description: 'Product ID to get review statistics for.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Review statistics retrieved successfully',
  })
  async getProductReviewStats(
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return await this.reviewService.getProductReviewStats(productId);
  }

  @Get('user')
  @ApiOperation({
    summary: 'Get reviews by authenticated user',
    description: 'Retrieve all reviews created by the authenticated user with pagination.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reviews retrieved successfully',
    type: [ReviewResponseDto],
  })
  async getUserReviews(
    @Request() req,
    @Query() paginationDto: PaginationDto,
  ) {
    return await this.reviewService.findReviewsByUserId(req.user.userId, paginationDto);
  }

  @Public()
  @Get(':id')
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
    status: HttpStatus.OK,
    description: 'Review retrieved successfully',
    type: ReviewResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Review not found',
  })
  async getReviewById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Review> {
    return await this.reviewService.findReviewById(id);
  }
}
