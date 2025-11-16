import { OrderItemStatus } from './../order/interfaces/order.interface';
import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationDto, PaginationOrder, PaginationResultDto } from '../../common/queries/dto';
import { Business } from '../businesses/business.entity';
import { OrderItem } from '../order/entity/order-items.entity';
import { Order } from '../order/entity/order.entity';
import { OrderStatus } from '../order/interfaces/order.interface';
import { Product } from '../product/entity/product.entity';
import { User } from '../users';
import { CreateReviewDto, UpdateReviewDto } from './dto/create-review.dto';
import { Review } from './entity/review.entity';



@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) { }

  /**
   * Create a new product review
   * @param userId - The user ID creating the review
   * @param reviewData - Review data including order and product info
   * @returns Promise<Review> - The created review
   */
  async createReview(userId: number, reviewData: CreateReviewDto): Promise<Review> {
    try {
      // First, validate that the order exists and belongs to the user
      const order = await this.orderRepository.findOne({
        where: { id: reviewData.orderId, userId },
        relations: ['items', 'business'],
      });

      if (!order) {
        throw new NotFoundException(
          `Order with ID ${reviewData.orderId} not found or does not belong to you`,
        );
      }

      // Check if the order is delivered
      if (order.status !== OrderStatus.DELIVERED) {
        throw new BadRequestException(
          'Cannot review a product from an order that is not delivered',
        );
      }

      // Find the specific order item
      const orderItem = order.items.find(item => item.id === reviewData.orderItemId);
      if (!orderItem) {
        throw new NotFoundException(
          `Order item with ID ${reviewData.orderItemId} not found in this order`,
        );
      }

      // Validate that the product ID matches the order item
      if (orderItem.productId !== reviewData.productId) {
        throw new BadRequestException(
          `Product ID ${reviewData.productId} does not match the product in the order item`,
        );
      }

      // Validate that the business ID matches the order
      if (order.businessId !== reviewData.businessId) {
        throw new BadRequestException('Business ID does not match the order');
      }

      // Check if order item status is delivered
      if (orderItem.status !== OrderItemStatus.DELIVERED) {
        throw new BadRequestException(
          'Cannot review a product that has not been delivered',
        );
      }

      // Check if review already exists for this order item
      const existingReview = await this.reviewRepository.findOne({
        where: {
          orderItemId: reviewData.orderItemId,
          userId,
        },
      });

      if (existingReview) {
        throw new BadRequestException(
          'You have already reviewed this product from this order',
        );
      }

      // Create the review
      const review = this.reviewRepository.create({
        ...reviewData,
        userId,
        isVerifiedPurchase: true,
      });

      // Save and return the review
      return await this.reviewRepository.save(review);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`Failed to create review: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Failed to create review: ${error.message}`,
      );
    }
  }

  /**
   * Update an existing review
   * @param userId - The user ID updating the review
   * @param reviewId - The review ID to update
   * @param updateData - The data to update
   * @returns Promise<Review> - The updated review
   */
  async updateReview(userId: number, reviewId: number, updateData: UpdateReviewDto): Promise<Review> {
    try {
      const review = await this.reviewRepository.findOne({
        where: { id: reviewId, userId },
      });

      if (!review) {
        throw new NotFoundException(
          `Review with ID ${reviewId} not found or does not belong to you`,
        );
      }

      // Update the review
      Object.assign(review, updateData);
      return await this.reviewRepository.save(review);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`Failed to update review: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Failed to update review: ${error.message}`,
      );
    }
  }

  /**
   * Delete a review
   * @param userId - The user ID deleting the review
   * @param reviewId - The review ID to delete
   */
  async deleteReview(userId: number, reviewId: number): Promise<void> {
    try {
      const review = await this.reviewRepository.findOne({
        where: { id: reviewId, userId },
      });

      if (!review) {
        throw new NotFoundException(
          `Review with ID ${reviewId} not found or does not belong to you`,
        );
      }

      await this.reviewRepository.softDelete(reviewId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`Failed to delete review: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Failed to delete review: ${error.message}`,
      );
    }
  }

  /**
   * Get reviews by product ID with pagination
   * @param productId - The product ID
   * @param paginationDto - Pagination options
   * @returns Promise<PaginationResultDto<Review>> - Paginated reviews
   */
  async findReviewsByProductId(
    productId: number,
    paginationDto?: PaginationDto,
  ): Promise<PaginationResultDto<Review>> {
    try {
      const product = await this.productRepository.findOne({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      const queryBuilder = this.reviewRepository
        .createQueryBuilder('review')
        .leftJoinAndSelect('review.user', 'user')
        .leftJoinAndSelect('review.product', 'product')
        .leftJoinAndSelect('review.business', 'business')
        .where('review.productId = :productId', { productId })
        .andWhere('review.isVisible = :isVisible', { isVisible: true });

      const itemCount = await queryBuilder.getCount();

      // Get pagination options or set defaults
      const { skip = 0, limit = 10, order = PaginationOrder.DESC, page = 1 } = paginationDto || {
        skip: 0,
        limit: 10,
        order: PaginationOrder.DESC,
        page: 1
      };

      const data = await queryBuilder
        .skip(skip)
        .take(limit)
        .orderBy('review.createdAt', order)
        .getMany();

      return new PaginationResultDto(data, {
        itemCount,
        pageOptionsDto: paginationDto || { skip, limit, order, page },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`Failed to find reviews by product id: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Failed to find reviews: ${error.message}`,
      );
    }
  }

  /**
   * Get reviews by business ID with pagination
   * @param businessId - The business ID
   * @param paginationDto - Pagination options
   * @returns Promise<PaginationResultDto<Review>> - Paginated reviews
   */
  async findReviewsByBusinessId(
    businessId: number,
    paginationDto?: PaginationDto,
  ): Promise<PaginationResultDto<Review>> {
    try {
      const business = await this.businessRepository.findOne({
        where: { id: businessId },
      });

      if (!business) {
        throw new NotFoundException(`Business with ID ${businessId} not found`);
      }

      const queryBuilder = this.reviewRepository
        .createQueryBuilder('review')
        .leftJoinAndSelect('review.user', 'user')
        .leftJoinAndSelect('review.product', 'product')
        .leftJoinAndSelect('review.business', 'business')
        .where('review.businessId = :businessId', { businessId })
        .andWhere('review.isVisible = :isVisible', { isVisible: true });

      const itemCount = await queryBuilder.getCount();

      // Get pagination options or set defaults
      const { skip = 0, limit = 10, order = PaginationOrder.DESC, page = 1 } = paginationDto || {
        skip: 0,
        limit: 10,
        order: PaginationOrder.DESC,
        page: 1
      };

      const data = await queryBuilder
        .skip(skip)
        .take(limit)
        .orderBy('review.createdAt', order)
        .getMany();

      return new PaginationResultDto(data, {
        itemCount,
        pageOptionsDto: paginationDto || { skip, limit, order, page },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`Failed to find reviews by business id: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Failed to find reviews: ${error.message}`,
      );
    }
  }

  /**
   * Get reviews by user ID with pagination
   * @param userId - The user ID
   * @param paginationDto - Pagination options
   * @returns Promise<PaginationResultDto<Review>> - Paginated reviews
   */
  async findReviewsByUserId(
    userId: number,
    paginationDto?: PaginationDto,
  ): Promise<PaginationResultDto<Review>> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      const queryBuilder = this.reviewRepository
        .createQueryBuilder('review')
        .leftJoinAndSelect('review.product', 'product')
        .leftJoinAndSelect('review.business', 'business')
        .where('review.userId = :userId', { userId });

      const itemCount = await queryBuilder.getCount();

      // Get pagination options or set defaults
      const { skip = 0, limit = 10, order = PaginationOrder.DESC, page = 1 } = paginationDto || {
        skip: 0,
        limit: 10,
        order: PaginationOrder.DESC,
        page: 1
      };

      const data = await queryBuilder
        .skip(skip)
        .take(limit)
        .orderBy('review.createdAt', order)
        .getMany();

      return new PaginationResultDto(data, {
        itemCount,
        pageOptionsDto: paginationDto || { skip, limit, order, page },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`Failed to find reviews by user id: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Failed to find reviews: ${error.message}`,
      );
    }
  }

  /**
   * Find a review by its ID
   * @param id - The review ID
   * @returns Promise<Review> - The review
   */
  async findReviewById(id: number): Promise<Review> {
    try {
      const review = await this.reviewRepository.findOne({
        where: { id },
        relations: ['user', 'business', 'product', 'order', 'orderItem'],
      });

      if (!review) {
        throw new NotFoundException(`Review with ID ${id} not found`);
      }

      return review;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`Failed to find review by id: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Failed to find review: ${error.message}`,
      );
    }
  }

  /**
   * Get the average rating for a product
   * @param productId - The product ID
   * @returns Promise<number> - The average rating
   */
  async getProductAverageRating(productId: number): Promise<number> {
    try {
      const product = await this.productRepository.findOne({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      const result = await this.reviewRepository
        .createQueryBuilder('review')
        .select('AVG(review.ratings)', 'average')
        .where('review.productId = :productId', { productId })
        .andWhere('review.isVisible = :isVisible', { isVisible: true })
        .getRawOne();

      return result.average ? Number((result.average).toFixed(1)) : 0;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`Failed to get product average rating: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Failed to get product average rating: ${error.message}`,
      );
    }
  }

  /**
   * Get review statistics for a product
   * @param productId - The product ID
   * @returns Promise<object> - The review statistics
   */
  async getProductReviewStats(productId: number): Promise<any> {
    try {
      const product = await this.productRepository.findOne({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      const totalReviews = await this.reviewRepository.count({
        where: {
          productId,
          isVisible: true
        }
      });

      // Get count for each rating 1-5
      const ratingCounts = await Promise.all(
        [1, 2, 3, 4, 5].map(async (rating) => {
          const count = await this.reviewRepository.count({
            where: {
              productId,
              ratings: rating,
              isVisible: true
            }
          });
          return { rating, count };
        })
      );

      // Calculate average rating
      const averageRating = await this.getProductAverageRating(productId);

      return {
        totalReviews,
        averageRating,
        ratingCounts: Object.fromEntries(
          ratingCounts.map(({ rating, count }) => [`rating${rating}`, count])
        ),
        ratingDistribution: ratingCounts,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`Failed to get product review stats: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Failed to get product review stats: ${error.message}`,
      );
    }
  }
}
