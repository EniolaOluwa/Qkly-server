import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus} from '../order/entity/order.entity';
import { Review } from './entity/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';


@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) {}

 
  // Review methods
  async createReview(reviewData: CreateReviewDto): Promise<Review> {
    // First, validate that the order exists and is delivered
    const order = await this.orderRepository.findOne({
      where: { id: reviewData.orderId },
      relations: ['user', 'business'],
    });

    if (!order) {
      throw new NotFoundException(
        `Order with ID ${reviewData.orderId} not found`,
      );
    }

    if (order.orderStatus !== OrderStatus.DELIVERED) {
      throw new BadRequestException(
        'Cannot review a product from an order that is not delivered',
      );
    }

    // Validate that the product exists
    // const product = await this.findProductById(reviewData.productId);

    // // Validate that the business exists and matches the order
    // if (order.businessId !== reviewData.businessId) {
    //   throw new BadRequestException('Business ID does not match the order');
    // }

    // Check if product is in the order's product details
    const productInOrder = order.productDetails.some(
      (productDetail) => productDetail.productId === reviewData.productId,
    );

    if (!productInOrder) {
      throw new BadRequestException(
        'Product is not part of the specified order',
      );
    }

    // Check if review already exists for this order (only one review per order allowed)
    const existingReview = await this.reviewRepository.findOne({
      where: {
        orderId: reviewData.orderId,
      },
    });

    if (existingReview) {
      throw new BadRequestException(
        'Review already exists for this order. Only one review per order is allowed.',
      );
    }

    const review = this.reviewRepository.create(reviewData);
    return await this.reviewRepository.save(review);
  }

  async findReviewsByProductId(productId: number): Promise<Review[]> {
    return await this.reviewRepository.find({
      where: { productId },
      relations: ['business', 'product'],
      order: { createdAt: 'DESC' },
    });
  }

  async findReviewsByBusinessId(businessId: number): Promise<Review[]> {
    return await this.reviewRepository.find({
      where: { businessId },
      relations: ['business', 'product'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAllReviews(): Promise<Review[]> {
    return await this.reviewRepository.find({
      relations: ['business', 'product'],
      order: { createdAt: 'DESC' },
    });
  }

  async findReviewById(id: number): Promise<Review> {
    const review = await this.reviewRepository.findOne({
      where: { id },
      relations: ['business', 'product'],
    });

    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    return review;
  }
}
