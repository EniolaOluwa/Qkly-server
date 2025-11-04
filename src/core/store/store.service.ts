import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus, TransactionStatus } from './order.entity';
import { Product } from './product.entity';
import { Review } from './review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { User } from '../users';
import { Business } from '../businesses/business.entity';

@Injectable()
export class StoreService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>
  ) {}

  // Order methods
  async createOrder(orderData: Partial<Order>): Promise<Order> {
    const order = this.orderRepository.create(orderData);
    return await this.orderRepository.save(order);
  }

  async findAllOrders(): Promise<Order[]> {
    return await this.orderRepository.find({
      relations: ['user', 'business'],
    });
  }

  async findOrderById(id: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['user', 'business'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async findOrdersByUserId(userId: number): Promise<Order[]> {
    return await this.orderRepository.find({
      where: { userId },
      relations: ['user', 'business'],
    });
  }

  async findOrdersByBusinessId(businessId: number): Promise<Order[]> {
    return await this.orderRepository.find({
      where: { businessId },
      relations: ['user', 'business'],
    });
  }

  async updateOrderStatus(
    id: number,
    orderStatus: OrderStatus,
  ): Promise<Order> {
    const order = await this.findOrderById(id);
    order.orderStatus = orderStatus;
    return await this.orderRepository.save(order);
  }

  async updateTransactionStatus(
    id: number,
    transactionStatus: TransactionStatus,
  ): Promise<Order> {
    const order = await this.findOrderById(id);
    order.transactionStatus = transactionStatus;
    return await this.orderRepository.save(order);
  }

  async updateOrder(id: number, updateData: Partial<Order>): Promise<Order> {
    const order = await this.findOrderById(id);
    Object.assign(order, updateData);
    return await this.orderRepository.save(order);
  }

  async deleteOrder(id: number): Promise<void> {
    const order = await this.findOrderById(id);
    await this.orderRepository.remove(order);
  }

  // Product methods
  async createProduct(productData: Partial<Product>): Promise<Product> {
    try {
       const userExists = await this.userRepository.findOne({ where: { id: productData.userId } });
    if (!userExists) {
      throw new BadRequestException('User does not exist.');
    }

    const businessExists = await this.businessRepository.findOne({ where: { id: productData.businessId } });
    if (!businessExists) {
      throw new BadRequestException('Business does not exist.');
    }
      if (productData.hasVariation) {
        const hasSizes = productData.sizes && productData.sizes.length > 0;
        const hasColors = productData.colors && productData.colors.length > 0;

        if (!hasSizes && !hasColors) {
          throw new BadRequestException(
            'Product marked as having variations must include at least one size or color.',
          );
        }
      }
      const product = this.productRepository.create(productData);
      return await this.productRepository.save(product);
    } catch (error) {
      console.log(error.message)
      throw new Error('An error occured');
    }
  }

  async findAllProducts(): Promise<Product[]> {
    try {
      return await this.productRepository.find({
        relations: ['user', 'business', 'sizes'],
      });
    } catch (error) {
      throw new Error('An error Occured');
    }
  }

  async findProductById(id: number): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['user', 'business'],
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async findProductsByUserId(userId: number): Promise<Product[]> {
    return await this.productRepository.find({
      where: { userId },
      relations: ['user', 'business'],
    });
  }

  async findProductsByBusinessId(businessId: number): Promise<Product[]> {
    return await this.productRepository.find({
      where: { businessId },
      relations: ['user', 'business'],
    });
  }

  async updateProduct(
    id: number,
    updateData: Partial<Product>,
  ): Promise<Product> {
    try {
      const product = await this.findProductById(id);
      Object.assign(product, updateData);
      return await this.productRepository.save(product);
    } catch (error) {
      throw new Error('An Error occured');
    }
  }

  async deleteProduct(id: number): Promise<void> {
    try {
      const product = await this.findProductById(id);
      await this.productRepository.remove(product);
    } catch (error) {
      throw new Error('An error occured');
    }
  }



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
    const product = await this.findProductById(reviewData.productId);

    // Validate that the business exists and matches the order
    if (order.businessId !== reviewData.businessId) {
      throw new BadRequestException('Business ID does not match the order');
    }

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
