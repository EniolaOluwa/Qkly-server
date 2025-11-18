import {
  BadRequestException,
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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { PaginationDto } from '../../common/queries/dto';
import {
  CreateReviewDto,
  GuestReviewVerificationDto,
  ReviewResponseDto,
  UpdateReviewDto
} from './dto/create-review.dto';
import { Review } from './entity/review.entity';
import { ReviewService } from './review.service';

@ApiTags('reviews')
@Controller('reviews')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) { }

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a product review',
    description: `Create a review for a product. Supports both authenticated and guest users.
    
    **Authenticated Users**: Provide JWT token, no guest fields needed.
    **Guest Users**: No JWT token required, must provide guestName and guestEmail that matches the order email.
    
    The order must be delivered to allow review creation. Only one review per order item is allowed.`,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Review created successfully',
    type: ReviewResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request - Order not delivered, review already exists, guest fields missing, or email mismatch',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Order or product not found',
  })
  async createReview(
    @Request() req,
    @Body() reviewData: CreateReviewDto
  ): Promise<Review> {
    // req.user will be undefined for guest users (due to @Public decorator)
    const userId = req.user?.userId || null;
    return await this.reviewService.createReview(userId, reviewData);
  }

  @Public()
  @Patch(':id')
  @ApiOperation({
    summary: 'Update a product review',
    description: `Update a review. Supports both authenticated and guest users.
    
    **Authenticated Users**: Provide JWT token. Review must belong to the authenticated user.
    **Guest Users**: Must provide email and orderReference in the request body for verification.`,
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
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request - Missing guest verification or order reference mismatch',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Review not found or does not belong to user/email',
  })
  async updateReview(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateReviewDto & Partial<GuestReviewVerificationDto>
  ): Promise<Review> {
    const userId = req.user?.userId || null;

    // Extract update data and guest verification separately
    const { email, orderReference, ...updateData } = body;

    const guestVerification = email && orderReference
      ? { email, orderReference }
      : undefined;

    return await this.reviewService.updateReview(
      userId,
      id,
      updateData,
      guestVerification
    );
  }

  @Public()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a product review',
    description: `Delete a review. Supports both authenticated and guest users.
    
    **Authenticated Users**: Provide JWT token. Review must belong to the authenticated user.
    **Guest Users**: Must provide email and orderReference in the request body for verification.`,
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
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request - Missing guest verification or order reference mismatch',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Review not found or does not belong to user/email',
  })
  async deleteReview(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() guestVerification?: GuestReviewVerificationDto
  ): Promise<void> {
    const userId = req.user?.userId || null;
    return await this.reviewService.deleteReview(userId, id, guestVerification);
  }

  @Public()
  @Get('product/:productId')
  @ApiOperation({
    summary: 'Get reviews for a product',
    description: 'Retrieve all visible reviews for a specific product with pagination. Public endpoint.',
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
    description: 'Retrieve all visible reviews for a specific business with pagination. Public endpoint.',
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
    description: 'Retrieve review statistics including total reviews, average rating, rating distribution, and authenticated vs guest review counts. Public endpoint.',
  })
  @ApiParam({
    name: 'productId',
    required: true,
    description: 'Product ID to get review statistics for.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Review statistics retrieved successfully',
    schema: {
      example: {
        totalReviews: 150,
        averageRating: 4.5,
        authenticatedReviews: 100,
        guestReviews: 50,
        ratingCounts: {
          rating1: 5,
          rating2: 10,
          rating3: 15,
          rating4: 40,
          rating5: 80
        },
        ratingDistribution: [
          { rating: 1, count: 5 },
          { rating: 2, count: 10 },
          { rating: 3, count: 15 },
          { rating: 4, count: 40 },
          { rating: 5, count: 80 }
        ]
      }
    }
  })
  async getProductReviewStats(
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return await this.reviewService.getProductReviewStats(productId);
  }

  @Public()
  @Get('guest')
  @ApiOperation({
    summary: 'Get reviews by guest email',
    description: 'Retrieve all reviews created by a guest user using their email address. Public endpoint.',
  })
  @ApiQuery({
    name: 'email',
    required: true,
    description: 'Guest email address to search for',
    example: 'john@example.com'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Guest reviews retrieved successfully',
    type: [ReviewResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Email query parameter is required',
  })
  async getReviewsByGuestEmail(
    @Query('email') email: string,
    @Query() paginationDto: PaginationDto,
  ) {
    if (!email) {
      throw new BadRequestException('Email query parameter is required');
    }
    return await this.reviewService.findReviewsByGuestEmail(email, paginationDto);
  }

  @Get('user')
  @ApiOperation({
    summary: 'Get reviews by authenticated user',
    description: 'Retrieve all reviews created by the authenticated user with pagination. Requires authentication.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reviews retrieved successfully',
    type: [ReviewResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - JWT token required',
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
    description: 'Retrieve a specific review by its ID with all related information. Public endpoint.',
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