import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationDto, PaginationOrder, PaginationResultDto } from '../../common/queries/dto';
import { Business } from '../businesses/business.entity';
import { OrderItem } from '../order/entity/order-items.entity';
import { Order } from '../order/entity/order.entity';
import { OrderStatus, OrderItemStatus } from '../../common/enums/order.enum';
import { Product } from '../product/entity/product.entity';
import { User } from '../users/entity/user.entity';
import { CreateReviewDto, GuestReviewVerificationDto, UpdateReviewDto } from './dto/create-review.dto';
import { Review } from './entity/review.entity';
import { ErrorHelper } from '../../common/utils';



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

  async createReview(userId: number | null, reviewData: CreateReviewDto): Promise<Review> {
    try {
      // Determine if this is a guest review
      const isGuestReview = !userId;

      // Validate guest review requirements
      if (isGuestReview && (!reviewData.guestEmail || !reviewData.guestName)) {
        ErrorHelper.BadRequestException(
          'Guest reviews require guestEmail and guestName',
        );
      }

      // Find the order with appropriate conditions
      const orderQuery: any = { id: reviewData.orderId };

      if (isGuestReview) {
        // For guest reviews, verify using email
        const order = await this.orderRepository.findOne({
          where: orderQuery,
          relations: ['items', 'business'],
        });

        if (!order) {
          ErrorHelper.NotFoundException(`Order with ID ${reviewData.orderId} not found`);
        }

        // Verify guest email matches order
        if (order.customerEmail.toLowerCase() !== (reviewData?.guestEmail ?? '').toLowerCase()) {
          ErrorHelper.BadRequestException(
            'Email does not match the order email',
          );
        }

        return await this.processReviewCreation(order, reviewData, null, true);
      } else {
        // For authenticated users
        orderQuery.userId = userId;

        const order = await this.orderRepository.findOne({
          where: orderQuery,
          relations: ['items', 'business'],
        });

        if (!order) {
          ErrorHelper.NotFoundException(
            `Order with ID ${reviewData.orderId} not found or does not belong to you`,
          );
        }

        return await this.processReviewCreation(order, reviewData, userId, false);
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`Failed to create review: ${error.message}`, error.stack);
      ErrorHelper.InternalServerErrorException(
        `Failed to create review: ${error.message}`,
      );
    }
  }


  private async processReviewCreation(
    order: Order,
    reviewData: CreateReviewDto,
    userId: number | null,
    isGuest: boolean,
  ): Promise<Review> {
    // Check if the order is delivered
    if (order.status !== OrderStatus.DELIVERED) {
      ErrorHelper.BadRequestException(
        'Cannot review a product from an order that is not delivered',
      );
    }

    // Find the specific order item
    const orderItem = order.items.find(item => item.id === reviewData.orderItemId);
    if (!orderItem) {
      ErrorHelper.NotFoundException(
        `Order item with ID ${reviewData.orderItemId} not found in this order`,
      );
    }

    // Validate that the product ID matches the order item
    if (orderItem.productId !== reviewData.productId) {
      ErrorHelper.BadRequestException(
        `Product ID ${reviewData.productId} does not match the product in the order item`,
      );
    }

    // Validate that the business ID matches the order
    if (order.businessId !== reviewData.businessId) {
      ErrorHelper.BadRequestException('Business ID does not match the order');
    }

    // Check if order item status is delivered
    if (orderItem.status !== OrderItemStatus.DELIVERED) {
      ErrorHelper.BadRequestException(
        'Cannot review a product that has not been delivered',
      );
    }

    // Check if review already exists for this order item
    const existingReviewQuery: any = { orderItemId: reviewData.orderItemId };

    if (isGuest) {
      existingReviewQuery.guestEmail = reviewData.guestEmail;
    } else {
      existingReviewQuery.userId = userId;
    }

    const existingReview = await this.reviewRepository.findOne({
      where: existingReviewQuery,
    });

    if (existingReview) {
      ErrorHelper.BadRequestException(
        'You have already reviewed this product from this order',
      );
    }

    // Create the review
    const reviewEntity: Partial<Review> = {
      orderId: reviewData.orderId,
      orderItemId: reviewData.orderItemId,
      productId: reviewData.productId,
      businessId: reviewData.businessId,
      review: reviewData.review,
      ratings: reviewData.ratings,
      imageUrls: reviewData.imageUrls || [],
      isVerifiedPurchase: true,
    };

    if (isGuest) {
      reviewEntity.userId = undefined;
      reviewEntity.guestName = reviewData.guestName;
      reviewEntity.guestEmail = reviewData.guestEmail;
      reviewEntity.guestPhone = reviewData.guestPhone || '';
    } else {
      reviewEntity.userId = Number(userId);
    }

    const review = this.reviewRepository.create(reviewEntity);

    // Save and return the review
    return await this.reviewRepository.save(review);
  }


  async updateReview(
    userId: number | null,
    reviewId: number,
    updateData: UpdateReviewDto,
    guestVerification?: GuestReviewVerificationDto,
  ): Promise<Review> {
    try {
      const isGuest = !userId;

      let review: Review;

      if (isGuest) {
        if (!guestVerification || !guestVerification.email || !guestVerification.orderReference) {
          ErrorHelper.BadRequestException(
            'Guest review updates require email and order reference for verification',
          );
        }

        // Find review with guest email
        review = await this.reviewRepository.findOne({
          where: { id: reviewId, guestEmail: guestVerification.email },
          relations: ['order'],
        }) as Review;

        if (!review) {
          ErrorHelper.NotFoundException(
            `Review with ID ${reviewId} not found or email does not match`,
          );
        }

        // Verify order reference
        if (review.order.orderReference !== guestVerification.orderReference) {
          ErrorHelper.BadRequestException('Order reference does not match');
        }
      } else {
        review = await this.reviewRepository.findOne({
          where: { id: reviewId, userId },
        }) as Review;

        if (!review) {
          ErrorHelper.NotFoundException(
            `Review with ID ${reviewId} not found or does not belong to you`,
          );
        }
      }

      Object.assign(review, updateData);
      return await this.reviewRepository.save(review);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`Failed to update review: ${error.message}`, error.stack);
      ErrorHelper.InternalServerErrorException(
        `Failed to update review: ${error.message}`,
      );
    }
  }

  async deleteReview(
    userId: number | null,
    reviewId: number,
    guestVerification?: GuestReviewVerificationDto,
  ): Promise<void> {
    try {
      const isGuest = !userId;

      let review: Review;

      if (isGuest) {
        if (!guestVerification || !guestVerification.email || !guestVerification.orderReference) {
          ErrorHelper.BadRequestException(
            'Guest review deletion requires email and order reference for verification',
          );
        }

        review = await this.reviewRepository.findOne({
          where: { id: reviewId, guestEmail: guestVerification.email },
          relations: ['order'],
        }) as Review;

        if (!review) {
          ErrorHelper.NotFoundException(
            `Review with ID ${reviewId} not found or email does not match`,
          );
        }

        if (review.order.orderReference !== guestVerification.orderReference) {
          ErrorHelper.BadRequestException('Order reference does not match');
        }
      } else {
        review = await this.reviewRepository.findOne({
          where: { id: reviewId, userId },
        }) as Review;

        if (!review) {
          ErrorHelper.NotFoundException(
            `Review with ID ${reviewId} not found or does not belong to you`,
          );
        }
      }

      await this.reviewRepository.softDelete(reviewId);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`Failed to delete review: ${error.message}`, error.stack);
      ErrorHelper.InternalServerErrorException(
        `Failed to delete review: ${error.message}`,
      );
    }
  }



  async findReviewsByProductId(
    productId: number,
    paginationDto?: PaginationDto,
  ): Promise<PaginationResultDto<Review>> {
    try {
      const product = await this.productRepository.findOne({
        where: { id: productId },
      });

      if (!product) {
        ErrorHelper.NotFoundException(`Product with ID ${productId} not found`);
      }

      const queryBuilder = this.reviewRepository
        .createQueryBuilder('review')
        .leftJoinAndSelect('review.user', 'user')
        .leftJoinAndSelect('review.product', 'product')
        .leftJoinAndSelect('review.business', 'business')
        .where('review.productId = :productId', { productId })
        .andWhere('review.isVisible = :isVisible', { isVisible: true });

      const itemCount = await queryBuilder.getCount();

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
      ErrorHelper.InternalServerErrorException(
        `Failed to find reviews: ${error.message}`,
      );
    }
  }


  async findReviewsByBusinessId(
    businessId: number,
    paginationDto?: PaginationDto,
  ): Promise<PaginationResultDto<Review>> {
    try {
      const business = await this.businessRepository.findOne({
        where: { id: businessId },
      });

      if (!business) {
        ErrorHelper.NotFoundException(`Business with ID ${businessId} not found`);
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
      ErrorHelper.InternalServerErrorException(
        `Failed to find reviews: ${error.message}`,
      );
    }
  }

  async findReviewsByUserId(
    userId: number,
    paginationDto?: PaginationDto,
  ): Promise<PaginationResultDto<Review>> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        ErrorHelper.NotFoundException(`User with ID ${userId} not found`);
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
      ErrorHelper.InternalServerErrorException(
        `Failed to find reviews: ${error.message}`,
      );
    }
  }


  async findReviewsByGuestEmail(
    email: string,
    paginationDto?: PaginationDto,
  ): Promise<PaginationResultDto<Review>> {
    try {
      const queryBuilder = this.reviewRepository
        .createQueryBuilder('review')
        .leftJoinAndSelect('review.product', 'product')
        .leftJoinAndSelect('review.business', 'business')
        .where('review.guestEmail = :email', { email: email.toLowerCase() })
        .andWhere('review.userId IS NULL');

      const itemCount = await queryBuilder.getCount();

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
      this.logger.error(`Failed to find reviews by guest email: ${error.message}`, error.stack);
      ErrorHelper.InternalServerErrorException(
        `Failed to find reviews: ${error.message}`,
      );
    }
  }



  async findReviewById(id: number): Promise<Review> {
    try {
      const review = await this.reviewRepository.findOne({
        where: { id },
        relations: ['user', 'business', 'product', 'order', 'orderItem'],
      });

      if (!review) {
        ErrorHelper.NotFoundException(`Review with ID ${id} not found`);
      }

      return review;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`Failed to find review by id: ${error.message}`, error.stack);
      ErrorHelper.InternalServerErrorException(
        `Failed to find review: ${error.message}`,
      );
    }
  }

  async getProductAverageRating(productId: number): Promise<number> {
    try {
      const product = await this.productRepository.findOne({
        where: { id: productId },
      });

      if (!product) {
        ErrorHelper.NotFoundException(`Product with ID ${productId} not found`);
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
      ErrorHelper.InternalServerErrorException(
        `Failed to get product average rating: ${error.message}`,
      );
    }
  }


  async getProductReviewStats(productId: number): Promise<any> {
    try {
      const product = await this.productRepository.findOne({
        where: { id: productId },
      });

      if (!product) {
        ErrorHelper.NotFoundException(`Product with ID ${productId} not found`);
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

      // Get counts for authenticated vs guest reviews
      const authenticatedReviewsCount = await this.reviewRepository
        .createQueryBuilder('review')
        .where('review.productId = :productId', { productId })
        .andWhere('review.isVisible = :isVisible', { isVisible: true })
        .andWhere('review.userId IS NOT NULL')
        .getCount();

      const guestReviewsCount = await this.reviewRepository
        .createQueryBuilder('review')
        .where('review.productId = :productId', { productId })
        .andWhere('review.isVisible = :isVisible', { isVisible: true })
        .andWhere('review.userId IS NULL')
        .getCount();

      return {
        totalReviews,
        averageRating,
        authenticatedReviews: authenticatedReviewsCount,
        guestReviews: guestReviewsCount,
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
      ErrorHelper.InternalServerErrorException(
        `Failed to get product review stats: ${error.message}`,
      );
    }
  }
}
