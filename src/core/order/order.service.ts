import { HttpService } from '@nestjs/axios';
import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { PaginationDto, PaginationOrder, PaginationResultDto } from '../../common/queries/dto';
import { Business } from '../businesses/business.entity';
import { Product } from '../product/entity/product.entity';
import { User } from '../users';
import { WalletsService } from '../wallets/wallets.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { FindAllOrdersDto, UpdateOrderItemStatusDto, UpdateOrderStatusDto } from './dto/filter-order.dot';
import { InitiatePaymentDto, PaymentCallbackDto, ProcessPaymentDto, VerifyPaymentDto } from './dto/payment.dto';
import { OrderItem } from './entity/order-items.entity';
import { Order } from './entity/order.entity';
import { DeliveryMethod, OrderItemStatus, OrderStatus, PaymentDetails, PaymentMethod, PaymentStatus, SettlementDetails } from './interfaces/order.interface';
// import { WalletsService } from '../wallets/wallets.service';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly walletsService: WalletsService, // Inject WalletsService
  ) { }

  async createOrder(userId: number, createOrderDto: CreateOrderDto): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const { businessId, items, ...orderData } = createOrderDto;

      // Verify user exists
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Verify business exists
      const business = await this.businessRepository.findOne({
        where: { id: businessId }
      });
      if (!business) {
        throw new NotFoundException('Business not found');
      }

      if (business.userId !== userId) {
        throw new BadRequestException('You do not have access to this business');
      }

      // Collect product IDs for bulk lookup
      const productIds = items.map(item => item.productId);

      // Fetch all products at once with their related data
      const products = await this.productRepository.find({
        where: { id: In(productIds) },
        relations: ['sizes']
      });

      // Create a map for quick access to products by ID
      const productsMap = new Map(products.map(product => [product.id, product]));

      // Validate and prepare order items, check inventory
      const orderItems: OrderItem[] = [];
      let subtotal = 0;

      for (const item of items) {
        const { productId, quantity, color, size } = item;
        const product = productsMap.get(productId);

        if (!product) {
          throw new NotFoundException(`Product with ID ${productId} not found`);
        }

        // Validate product belongs to the specified business
        if (product.businessId !== businessId) {
          throw new BadRequestException(
            `Product with ID ${productId} does not belong to the specified business`,
          );
        }

        // Check inventory
        if (product.quantityInStock < quantity) {
          throw new BadRequestException(
            `Insufficient inventory for product "${product.name}". Requested: ${quantity}, Available: ${product.quantityInStock}`,
          );
        }

        // Validate color if product has variations
        if (product.hasVariation && color && !product.colors.includes(color)) {
          throw new BadRequestException(
            `Invalid color "${color}" for product "${product.name}". Available colors: ${product.colors.join(', ')}`,
          );
        }


        if (product.hasVariation && size) {
          // Get all valid sizes using a type-safe approach
          const validSizes: string[] = [];

          for (const productSize of product.sizes) {
            if (typeof productSize.value === 'string') {
              validSizes.push(productSize.value);
            } else if (Array.isArray(productSize.value)) {
              validSizes.push(...productSize.value);
            }
          }

          if (!validSizes.includes(size)) {
            throw new BadRequestException(
              `Invalid size "${size}" for product "${product.name}". Available sizes: ${validSizes.join(', ')}`,
            );
          }
        }

        // Calculate item subtotal
        const itemSubtotal = product.price * quantity;
        subtotal += itemSubtotal;

        // Create order item
        const orderItem = this.orderItemRepository.create({
          productId,
          productName: product.name,
          productDescription: product.description,
          price: product.price,
          quantity,
          subtotal: itemSubtotal,
          color,
          size,
          imageUrls: product.images ? [...product.images].slice(0, 3) : [],
        });

        orderItems.push(orderItem);

        // Update product inventory (reserve stock)
        product.quantityInStock -= quantity;
        await queryRunner.manager.save(product);
      }

      // Calculate order totals
      const shippingFee = this.calculateShippingFee(createOrderDto.deliveryMethod);
      const tax = this.calculateTax(subtotal);
      const discount = 0; // No discount for now, could be calculated based on promo codes
      const total = subtotal + shippingFee + tax - discount;

      // Generate order reference
      const orderReference = `ORD-${uuidv4().substring(0, 8).toUpperCase()}`;
      const transactionReference = `TXN-${uuidv4().substring(0, 8).toUpperCase()}`;

      // Create order
      const order = this.orderRepository.create({
        ...orderData,
        userId,
        businessId,
        orderReference,
        transactionReference,
        subtotal,
        shippingFee,
        tax,
        discount,
        total,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
      });

      // Save order
      const savedOrder = await queryRunner.manager.save(order);

      // Associate order items with the saved order
      for (const item of orderItems) {
        item.orderId = savedOrder.id;
        await queryRunner.manager.save(item);
      }

      // If payment method is Cash on Delivery, change status to confirmed
      if (createOrderDto.paymentMethod === PaymentMethod.CASH_ON_DELIVERY) {
        savedOrder.status = OrderStatus.CONFIRMED;
        await queryRunner.manager.save(savedOrder);
      }

      // Commit transaction
      await queryRunner.commitTransaction();

      // Reload order with items
      const completeOrder = await this.orderRepository.findOne({
        where: { id: savedOrder.id },
        relations: ['items', 'user', 'business'],
      });

      if (!completeOrder) {
        throw new NotFoundException(`Order with ID ${savedOrder.id} not found`);
      }

      return completeOrder;
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();

      this.logger.error(`Failed to create order: ${error.message}`, error.stack);

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Failed to create order: ${error.message}`,
      );
    } finally {
      // Release query runner
      await queryRunner.release();
    }
  }

  private calculateShippingFee(deliveryMethod: DeliveryMethod): number {
    switch (deliveryMethod) {
      case DeliveryMethod.EXPRESS:
        return 0; // Higher fee for express delivery
      case DeliveryMethod.STANDARD:
        return 0; // Standard delivery fee
      case DeliveryMethod.PICKUP:
        return 0; // No fee for pickup
      default:
        return 0; // Default to standard fee
    }
  }

  private calculateTax(subtotal: number): number {
    return subtotal * 0;
    // return subtotal * 0.075; 
  }



  async findAllOrders(
    query: FindAllOrdersDto & PaginationDto,
  ): Promise<PaginationResultDto<Order>> {
    try {
      const {
        userId,
        businessId,
        status,
        paymentStatus,
        paymentMethod,
        deliveryMethod,
        minTotal,
        maxTotal,
        search,
        startDate,
        endDate,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
        skip,
        limit,
      } = query;

      // Create QueryBuilder for flexible filtering
      const qb = this.orderRepository
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.user', 'user')
        .leftJoinAndSelect('order.business', 'business')
        .leftJoinAndSelect('order.items', 'items')
        .select([
          'order',
          'user.id', 'user.firstName', 'user.lastName', 'user.email',
          'business.id', 'business.businessName', 'business.logo',
          'items'
        ]);

      // Apply filters
      if (userId) {
        qb.andWhere('order.userId = :userId', { userId });
      }

      if (businessId) {
        qb.andWhere('order.businessId = :businessId', { businessId });
      }

      if (status) {
        qb.andWhere('order.status = :status', { status });
      }

      if (paymentStatus) {
        qb.andWhere('order.paymentStatus = :paymentStatus', { paymentStatus });
      }

      if (paymentMethod) {
        qb.andWhere('order.paymentMethod = :paymentMethod', { paymentMethod });
      }

      if (deliveryMethod) {
        qb.andWhere('order.deliveryMethod = :deliveryMethod', { deliveryMethod });
      }

      if (minTotal !== undefined) {
        qb.andWhere('order.total >= :minTotal', { minTotal });
      }

      if (maxTotal !== undefined) {
        qb.andWhere('order.total <= :maxTotal', { maxTotal });
      }

      // Full-text search on multiple fields
      if (search) {
        qb.andWhere(
          '(order.orderReference LIKE :search OR ' +
          'order.customerName LIKE :search OR ' +
          'order.customerEmail LIKE :search OR ' +
          'order.customerPhoneNumber LIKE :search)',
          { search: `%${search}%` }
        );
      }

      if (startDate) {
        qb.andWhere('order.createdAt >= :startDate', {
          startDate: new Date(startDate)
        });
      }

      if (endDate) {
        qb.andWhere('order.createdAt <= :endDate', {
          endDate: new Date(endDate)
        });
      }

      // Count total results
      const itemCount = await qb.getCount();

      // Apply sorting
      const allowedSortFields = [
        'id', 'status', 'paymentStatus', 'total', 'createdAt', 'updatedAt'
      ];

      const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
      const validSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

      qb.orderBy(`order.${validSortBy}`, validSortOrder);

      // Apply pagination
      qb.skip(skip).take(limit);

      // Execute query
      const data = await qb.getMany();

      // Create a proper pagination object with all required fields
      const paginationDto: PaginationDto = {
        skip,
        limit,
        order: validSortOrder as PaginationOrder,
        page: Math.floor(skip / limit) + 1,
      };

      return new PaginationResultDto(data, {
        itemCount,
        pageOptionsDto: paginationDto,
      });
    } catch (error) {
      this.logger.error(`Failed to find orders: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Failed to find orders: ${error.message}`,
      );
    }
  }



  async findOrderById(id: number): Promise<Order> {
    try {
      // Option 1: Use QueryBuilder with specific field selection
      const order = await this.orderRepository
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.items', 'items')
        .leftJoinAndSelect('order.user', 'user')
        .leftJoinAndSelect('order.business', 'business')
        .where('order.id = :id', { id })
        .select([
          'order',
          'user.id',
          'user.firstName',
          'user.lastName',
          'user.email',
          'business.id',
          'business.businessName',
          'business.location',
          'business.logo',
          'items'
        ])
        .getOne();

      if (!order) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }

      return order;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`Failed to find order by id: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Failed to find order: ${error.message}`,
      );
    }
  }

  async findOrderByReference(orderReference: string): Promise<Order> {
    try {
      const order = await this.orderRepository
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.items', 'items')
        .leftJoinAndSelect('order.user', 'user')
        .leftJoinAndSelect('order.business', 'business')
        .where('order.orderReference = :orderReference', { orderReference })
        .select([
          'order',
          'user.id', 'user.firstName', 'user.lastName', 'user.email',
          'business.id', 'business.businessName', 'business.location', 'business.logo',
          'items'
        ])
        .getOne();

      if (!order) {
        throw new NotFoundException(`Order with reference ${orderReference} not found`);
      }

      return order;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`Failed to find order by reference: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Failed to find order: ${error.message}`,
      );
    }
  }


  async findOrderByTransactionReference(transactionReference: string): Promise<Order> {
    try {
      const order = await this.orderRepository
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.items', 'items')
        .leftJoinAndSelect('order.user', 'user')
        .leftJoinAndSelect('order.business', 'business')
        .where('order.transactionReference = :transactionReference', { transactionReference })
        .select([
          'order',
          'user.id', 'user.firstName', 'user.lastName', 'user.email',
          'business.id', 'business.businessName', 'business.location', 'business.logo',
          'items'
        ])
        .getOne();

      if (!order) {
        throw new NotFoundException(`Order with transaction reference ${transactionReference} not found`);
      }

      return order;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`Failed to find order by transaction reference: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Failed to find order: ${error.message}`,
      );
    }
  }


  async findOrdersByUserId(
    userId: number,
    query?: PaginationDto,
  ): Promise<PaginationResultDto<Order>> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      const qb = this.orderRepository
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.items', 'items')
        .leftJoinAndSelect('order.business', 'business')
        .where('order.userId = :userId', { userId })
        .select([
          'order',
          'business.id', 'business.businessName', 'business.logo',
          'items'
        ]);

      const itemCount = await qb.getCount();

      // Get pagination options or set defaults
      const { skip = 0, limit = 10, order = PaginationOrder.DESC } = query || {};

      const data = await qb
        .skip(skip)
        .take(limit)
        .orderBy('order.createdAt', order)
        .getMany();

      const paginationDto: PaginationDto = query || {
        skip,
        limit,
        order,
        page: Math.floor(skip / limit) + 1,
      };

      return new PaginationResultDto(data, {
        itemCount,
        pageOptionsDto: paginationDto,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`Failed to find orders by user id: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Failed to find orders: ${error.message}`,
      );
    }
  }

  async findOrdersByBusinessId(
    businessId: number,
    query?: PaginationDto,
  ): Promise<PaginationResultDto<Order>> {
    try {
      const business = await this.businessRepository.findOne({
        where: { id: businessId },
      });

      if (!business) {
        throw new NotFoundException(`Business with ID ${businessId} not found`);
      }

      const qb = this.orderRepository
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.items', 'items')
        .leftJoinAndSelect('order.user', 'user')
        .where('order.businessId = :businessId', { businessId })
        .select([
          'order',
          'user.id', 'user.firstName', 'user.lastName', 'user.email',
          'items'
        ]);

      const itemCount = await qb.getCount();

      // Get pagination options or set defaults
      const { skip = 0, limit = 10, order = PaginationOrder.DESC } = query || {};

      const data = await qb
        .skip(skip)
        .take(limit)
        .orderBy('order.createdAt', order)
        .getMany();

      // Create a proper pagination object
      const paginationDto: PaginationDto = query || {
        skip,
        limit,
        order,
        page: Math.floor(skip / limit) + 1,
      };

      return new PaginationResultDto(data, {
        itemCount,
        pageOptionsDto: paginationDto,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`Failed to find orders by business id: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Failed to find orders: ${error.message}`,
      );
    }
  }


  /**
   * Initialize payment with Monnify
   * @param initiatePaymentDto - Payment initialization data
   * @returns Promise<any> - Payment initialization result with checkout URL
   */
  async initializePayment(initiatePaymentDto: InitiatePaymentDto): Promise<any> {
    try {
      const { orderId, paymentMethod, redirectUrl, metadata } = initiatePaymentDto;

      // Find the order
      const order = await this.findOrderById(orderId);

      if (order.paymentStatus === PaymentStatus.PAID) {
        throw new ConflictException('Payment has already been processed for this order');
      }

      // Get Monnify contract code
      const monnifyContractCode = this.configService.get<string>(
        'MONNIFY_CONTRACT_CODE',
      );
      const appUrl = this.configService.get<string>('APP_URL', 'https://example.com');
      const actualRedirectUrl = redirectUrl || `${appUrl}/orders/payment-callback`;

      if (!monnifyContractCode) {
        throw new InternalServerErrorException('Monnify contract code not configured');
      }

      // Prepare payment initialization payload
      const payload = {
        amount: Number(order.total),
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        paymentReference: order.transactionReference,
        paymentDescription: `Payment for Order ${order.orderReference}`,
        currencyCode: 'NGN',
        contractCode: monnifyContractCode,
        redirectUrl: actualRedirectUrl,
        paymentMethods: this.walletsService.getPaymentMethodsForMonnify(paymentMethod),
        metadata: {
          orderId: order.id,
          orderReference: order.orderReference,
          ...metadata,
        },
      };



      // Call Monnify Initialize Transaction API through WalletService
      const paymentResponse = await this.walletsService.initializeMonnifyPayment(payload);

      // Update order payment status to INITIATED
      await this.orderRepository.update(order.id, {
        paymentStatus: PaymentStatus.INITIATED,
        paymentMethod,
      });

      return {
        success: true,
        message: 'Payment initialized successfully',
        data: {
          orderId: order.id,
          orderReference: order.orderReference,
          transactionReference: order.transactionReference,
          checkoutUrl: paymentResponse.responseBody.checkoutUrl,
          paymentMethod: paymentMethod,
          expiresAt: paymentResponse.responseBody.expiresAt,
        }
      };
    } catch (error) {
      this.logger.error(`Payment initialization failed: ${error.message}`, error.stack);

      if (error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof InternalServerErrorException) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Failed to initialize payment: ${error.message}`,
      );
    }
  }

  /**
   * Process payment for an order
   * @param processPaymentDto - Payment processing data
   * @returns Promise<Order> - The updated order
   */
  async processPayment(processPaymentDto: ProcessPaymentDto): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { orderId, paymentMethod, amount, paymentReference, metadata } = processPaymentDto;

      // Find the order
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
        relations: ['items'],
      });

      if (!order) {
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      }

      // Validate payment status
      if (order.paymentStatus === PaymentStatus.PAID) {
        throw new ConflictException('Payment has already been processed for this order');
      }

      // Validate payment amount
      if (amount < order.total) {
        throw new BadRequestException(
          `Payment amount (${amount}) is less than order total (${order.total})`,
        );
      }

      // Update order payment details
      const paymentDetails: PaymentDetails = {
        paymentMethod,
        paymentReference,
        transactionReference: order.transactionReference,
        paymentDate: new Date(),
        amount,
        currency: 'NGN', // Assuming Nigerian Naira as default
        meta: metadata,
      };

      order.paymentStatus = PaymentStatus.PAID;
      order.status = OrderStatus.PROCESSING;
      order.paymentMethod = paymentMethod;
      order.paymentDate = new Date();
      order.paymentDetails = paymentDetails;

      // Update order items status
      for (const item of order.items) {
        item.status = OrderItemStatus.PROCESSING;
        await queryRunner.manager.save(OrderItem, item);
      }

      // Save updated order
      await queryRunner.manager.save(Order, order);

      // Handle business settlement
      await this.handleBusinessSettlement(order.id, queryRunner.manager);

      // Commit transaction
      await queryRunner.commitTransaction();

      return await this.findOrderById(orderId);
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();

      this.logger.error(`Failed to process payment: ${error.message}`, error.stack);

      if (error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Failed to process payment: ${error.message}`,
      );
    } finally {
      // Release query runner
      await queryRunner.release();
    }
  }

  /**
   * Handle payment callback from Monnify
   * @param paymentCallbackDto - Payment callback data
   * @returns Promise<Order> - The updated order
   */
  async handlePaymentCallback(paymentCallbackDto: PaymentCallbackDto): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { eventType, eventData } = paymentCallbackDto;

      // Validate event type
      if (!eventType.includes('TRANSACTION')) {
        throw new BadRequestException(`Unsupported event type: ${eventType}`);
      }

      const {
        transactionReference,
        paymentReference,
        amountPaid,
        paymentStatus,
        paymentMethod,
        paidOn,
        metaData,
      } = eventData;

      // Find order by transaction reference
      const order = await this.orderRepository.findOne({
        where: { transactionReference },
        relations: ['items', 'business'],
      });

      if (!order) {
        throw new NotFoundException(`Order with transaction reference ${transactionReference} not found`);
      }

      // Map Monnify payment status to our payment status
      let mappedPaymentStatus: PaymentStatus;
      let mappedOrderStatus: OrderStatus;

      switch (paymentStatus.toUpperCase()) {
        case 'PAID':
        case 'SUCCESSFUL':
          mappedPaymentStatus = PaymentStatus.PAID;
          mappedOrderStatus = OrderStatus.PROCESSING;
          break;
        case 'PENDING':
          mappedPaymentStatus = PaymentStatus.PENDING;
          mappedOrderStatus = OrderStatus.PENDING;
          break;
        case 'FAILED':
          mappedPaymentStatus = PaymentStatus.FAILED;
          mappedOrderStatus = OrderStatus.PENDING;
          break;
        case 'EXPIRED':
          mappedPaymentStatus = PaymentStatus.EXPIRED;
          mappedOrderStatus = OrderStatus.PENDING;
          break;
        default:
          mappedPaymentStatus = PaymentStatus.PENDING;
          mappedOrderStatus = OrderStatus.PENDING;
      }

      // Skip processing if payment is already marked as PAID
      if (order.paymentStatus === PaymentStatus.PAID && mappedPaymentStatus !== PaymentStatus.PAID) {
        return order; // Payment already processed, no need to update
      }

      // Map payment method
      const mappedPaymentMethod = this.mapPaymentMethod(paymentMethod);

      // Update order payment details
      const paymentDetails: PaymentDetails = {
        paymentMethod: mappedPaymentMethod,
        paymentReference,
        transactionReference,
        paymentDate: new Date(paidOn || new Date()),
        amount: amountPaid,
        currency: 'NGN',
        meta: metaData,
      };

      order.paymentStatus = mappedPaymentStatus;
      order.status = mappedOrderStatus;
      order.paymentMethod = mappedPaymentMethod;
      order.paymentDate = new Date(paidOn || new Date());
      order.paymentDetails = paymentDetails;

      // If payment is successful, update order and item status
      if (mappedPaymentStatus === PaymentStatus.PAID) {
        // Update order items status
        for (const item of order.items) {
          item.status = OrderItemStatus.PROCESSING;
          await queryRunner.manager.save(OrderItem, item);
        }

        // Handle business settlement
        await this.handleBusinessSettlement(order.id, queryRunner.manager);
      }

      // Save updated order
      await queryRunner.manager.save(Order, order);

      // Commit transaction
      await queryRunner.commitTransaction();

      return await this.findOrderById(order.id);
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();

      this.logger.error(`Failed to process payment callback: ${error.message}`, error.stack);

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Failed to process payment callback: ${error.message}`,
      );
    } finally {
      // Release query runner
      await queryRunner.release();
    }
  }

  /**
   * Verify payment status with Monnify
   * @param verifyPaymentDto - Payment verification data
   * @returns Promise<any> - The verified payment result
   */
  async verifyPayment(verifyPaymentDto: VerifyPaymentDto): Promise<any> {
    try {
      const { transactionReference } = verifyPaymentDto;

      // Find the order
      let order: Order;
      try {
        order = await this.findOrderByTransactionReference(transactionReference);
      } catch (error) {
        throw new NotFoundException(`Order with transaction reference ${transactionReference} not found`);
      }

      // Verify transaction status with Monnify through WalletService
      const transaction = await this.walletsService.verifyMonnifyPayment(transactionReference);

      // If payment is successful and not yet marked as paid, update order
      if (
        transaction.paymentStatus === 'PAID' &&
        order.paymentStatus !== PaymentStatus.PAID
      ) {
        // Create payment callback data
        const paymentCallbackDto: PaymentCallbackDto = {
          eventType: 'SUCCESSFUL_TRANSACTION',
          eventData: {
            productType: 'COLLECTION',
            transactionReference: transaction.transactionReference,
            paymentReference: transaction.paymentReference,
            amountPaid: transaction.amount,
            totalPayment: transaction.amount,
            settlementAmount: transaction.amount * 0.985, // Assuming 1.5% Monnify fee
            paymentStatus: transaction.paymentStatus,
            paymentMethod: transaction.paymentMethod,
            paidOn: transaction.createdOn,
            customer: {
              name: transaction.customerName,
              email: transaction.customerEmail,
            },
            metaData: transaction.meta,
          },
        };

        // Process the payment callback
        await this.handlePaymentCallback(paymentCallbackDto);
      }

      // Get updated order
      const updatedOrder = await this.findOrderById(order.id);

      return {
        success: true,
        message: 'Payment verification completed',
        data: {
          orderId: updatedOrder.id,
          orderReference: updatedOrder.orderReference,
          transactionReference: updatedOrder.transactionReference,
          paymentStatus: updatedOrder.paymentStatus,
          orderStatus: updatedOrder.status,
          verificationResult: {
            paymentReference: transaction.paymentReference,
            amountPaid: transaction.amount,
            paymentStatus: transaction.paymentStatus,
            paymentMethod: transaction.paymentMethod,
            paidOn: transaction.createdOn,
          }
        }
      };
    } catch (error) {
      this.logger.error(`Payment verification failed: ${error.message}`, error.stack);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Failed to verify payment: ${error.message}`,
      );
    }
  }

  private mapPaymentMethod(paymentMethodStr: string): PaymentMethod {
    const methodMap: Record<string, PaymentMethod> = {
      'CARD': PaymentMethod.CARD,
      'ACCOUNT_TRANSFER': PaymentMethod.BANK_TRANSFER,
      'BANK_TRANSFER': PaymentMethod.BANK_TRANSFER,
      'WALLET': PaymentMethod.WALLET,
      'USSD': PaymentMethod.USSD,
    };

    return methodMap[paymentMethodStr.toUpperCase()] || PaymentMethod.MONNIFY;
  }

  /**
   * Handle business settlement for successful orders
   * @private
   * @param orderId - The order ID
   * @param entityManager - Entity manager for transaction
   */
  private async handleBusinessSettlement(
    orderId: number,
    entityManager: EntityManager
  ): Promise<void> {
    try {
      const order = await entityManager.findOne(Order, {
        where: { id: orderId },
        relations: ['business', 'items'],
      });

      if (!order || order.paymentStatus !== PaymentStatus.PAID) {
        return;
      }

      // Skip if already settled
      if (order.isBusinessSettled) {
        return;
      }

      const business = order.business;

      // Calculate business payout amount (total minus platform fee)
      const platformFeePercentage = 0.05; // 5% platform fee
      const platformFee = order.total * platformFeePercentage;
      const businessPayoutAmount = order.total - platformFee;

      // Generate settlement reference
      const settlementReference = `STL-${uuidv4().substring(0, 8).toUpperCase()}`;

      // Create settlement details
      const settlementDetails: SettlementDetails = {
        businessId: business.id,
        businessName: business.businessName,
        amount: order.total,
        platformFee,
        settlementAmount: businessPayoutAmount,
        reference: settlementReference,
        status: 'PENDING',
        settlementDate: new Date(),
      };

      // Update order with settlement details
      order.isBusinessSettled = true;
      order.settlementReference = settlementReference;
      order.settlementDate = new Date();
      order.settlementDetails = settlementDetails;

      await entityManager.save(Order, order);

      this.logger.log(
        `Business settlement initiated for order ${orderId}, business ${business.id}, amount ${businessPayoutAmount}`,
      );

      // In a real implementation, you would initiate a transfer to the business account here
      // and handle callbacks for settlement status
    } catch (error) {
      this.logger.error(`Failed to process business settlement: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateOrderStatus(
    orderId: number,
    updateStatusDto: UpdateOrderStatusDto,
  ): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { status, notes, metadata } = updateStatusDto;

      const order = await this.orderRepository.findOne({
        where: { id: orderId },
        relations: ['items'],
      });

      if (!order) {
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      }

      // Validate status transition
      this.validateStatusTransition(order.status, status);

      // Update order status
      order.status = status;

      if (notes) {
        order.notes = notes;
      }

      // Update order items status based on order status
      let itemStatus: OrderItemStatus;

      switch (status) {
        case OrderStatus.PROCESSING:
          itemStatus = OrderItemStatus.PROCESSING;
          break;
        case OrderStatus.CONFIRMED:
          itemStatus = OrderItemStatus.PROCESSING;
          break;
        case OrderStatus.SHIPPED:
          itemStatus = OrderItemStatus.SHIPPED;
          break;
        case OrderStatus.DELIVERED:
          itemStatus = OrderItemStatus.DELIVERED;
          break;
        case OrderStatus.CANCELLED:
          itemStatus = OrderItemStatus.CANCELLED;
          // Return inventory for cancelled orders
          await this.returnInventoryForOrder(order, queryRunner.manager);
          break;
        case OrderStatus.RETURNED:
          itemStatus = OrderItemStatus.RETURNED;
          // Return inventory for returned orders
          await this.returnInventoryForOrder(order, queryRunner.manager);
          break;
        case OrderStatus.REFUNDED:
          itemStatus = OrderItemStatus.REFUNDED;
          // No inventory change for refunded orders if already returned
          break;
        default:
          itemStatus = order.items[0]?.status || OrderItemStatus.PENDING;
      }

      // Update all items with the new status
      for (const item of order.items) {
        item.status = itemStatus;
        await queryRunner.manager.save(OrderItem, item);
      }

      // Save updated order
      await queryRunner.manager.save(Order, order);

      // Commit transaction
      await queryRunner.commitTransaction();

      return await this.findOrderById(orderId);
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();

      this.logger.error(`Failed to update order status: ${error.message}`, error.stack);

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Failed to update order status: ${error.message}`,
      );
    } finally {
      // Release query runner
      await queryRunner.release();
    }
  }

  async updateOrderItemStatus(
    orderId: number,
    itemId: number,
    updateStatusDto: UpdateOrderItemStatusDto,
  ): Promise<OrderItem> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { status, notes } = updateStatusDto;

      // Find the order
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
        relations: ['items'],
      });

      if (!order) {
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      }

      // Find the order item
      const item = order.items.find(item => item.id === itemId);

      if (!item) {
        throw new NotFoundException(`Order item with ID ${itemId} not found in order ${orderId}`);
      }

      // Update the item status
      item.status = status;

      if (notes) {
        item.notes = notes;
      }

      // If cancelling or returning, return inventory for this item
      if (
        status === OrderItemStatus.CANCELLED ||
        status === OrderItemStatus.RETURNED
      ) {
        await this.returnInventoryForOrderItem(item, queryRunner.manager);
      }

      // Save the updated item
      await queryRunner.manager.save(OrderItem, item);

      // Check if all items have the same status and update order status accordingly
      const allItemsHaveStatus = order.items.every(i => i.status === status);

      if (allItemsHaveStatus) {
        // Map item status to order status
        const orderStatus = this.mapOrderItemStatusToOrderStatus(status);

        // Only update if valid status mapping exists
        if (orderStatus) {
          order.status = orderStatus;
          await queryRunner.manager.save(Order, order);
        }
      }

      // Commit transaction
      await queryRunner.commitTransaction();

      return item;
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();

      this.logger.error(`Failed to update order item status: ${error.message}`, error.stack);

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Failed to update order item status: ${error.message}`,
      );
    } finally {
      // Release query runner
      await queryRunner.release();
    }
  }

  private mapOrderItemStatusToOrderStatus(itemStatus: OrderItemStatus): OrderStatus | null {
    const statusMap: Record<OrderItemStatus, OrderStatus> = {
      [OrderItemStatus.PENDING]: OrderStatus.PENDING,
      [OrderItemStatus.PROCESSING]: OrderStatus.PROCESSING,
      [OrderItemStatus.SHIPPED]: OrderStatus.SHIPPED,
      [OrderItemStatus.DELIVERED]: OrderStatus.DELIVERED,
      [OrderItemStatus.CANCELLED]: OrderStatus.CANCELLED,
      [OrderItemStatus.RETURNED]: OrderStatus.RETURNED,
      [OrderItemStatus.REFUNDED]: OrderStatus.REFUNDED,
    };

    return statusMap[itemStatus] || null;
  }

  private validateStatusTransition(
    currentStatus: OrderStatus,
    newStatus: OrderStatus,
  ): void {
    // Define valid status transitions
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [
        OrderStatus.PROCESSING,
        OrderStatus.CONFIRMED,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.PROCESSING]: [
        OrderStatus.CONFIRMED,
        OrderStatus.SHIPPED,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.CONFIRMED]: [
        OrderStatus.SHIPPED,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.SHIPPED]: [
        OrderStatus.DELIVERED,
        OrderStatus.RETURNED,
      ],
      [OrderStatus.DELIVERED]: [
        OrderStatus.RETURNED,
        OrderStatus.REFUNDED,
      ],
      [OrderStatus.CANCELLED]: [
        OrderStatus.REFUNDED,
      ],
      [OrderStatus.RETURNED]: [
        OrderStatus.REFUNDED,
      ],
      [OrderStatus.REFUNDED]: [],
    };

    // Allow same status (no change)
    if (currentStatus === newStatus) {
      return;
    }

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}. Valid transitions: ${validTransitions[currentStatus].join(', ')}`,
      );
    }
  }

  private async returnInventoryForOrder(
    order: Order,
    entityManager: EntityManager,
  ): Promise<void> {
    try {
      // Only return inventory if order was previously in a state that reserved inventory
      const inventoryReservingStatuses = [
        OrderStatus.PENDING,
        OrderStatus.PROCESSING,
        OrderStatus.CONFIRMED,
        OrderStatus.SHIPPED,
      ];

      if (!inventoryReservingStatuses.includes(order.status)) {
        return;
      }

      for (const item of order.items) {
        await this.returnInventoryForOrderItem(item, entityManager);
      }
    } catch (error) {
      this.logger.error(`Failed to return inventory: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async returnInventoryForOrderItem(
    item: OrderItem,
    entityManager: EntityManager,
  ): Promise<void> {
    try {
      // Only return inventory if item was not already cancelled or returned
      const inventoryReservingStatuses = [
        OrderItemStatus.PENDING,
        OrderItemStatus.PROCESSING,
        OrderItemStatus.SHIPPED,
      ];

      if (!inventoryReservingStatuses.includes(item.status)) {
        return;
      }

      const product = await entityManager.findOne(Product, {
        where: { id: item.productId },
      });

      if (product) {
        // Return the quantity back to inventory
        product.quantityInStock += item.quantity;
        await entityManager.save(Product, product);

        this.logger.log(
          `Returned ${item.quantity} units to inventory for product ${product.id} from order item ${item.id}`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to return inventory for item: ${error.message}`, error.stack);
      throw error;
    }
  }

  async deleteOrder(id: number): Promise<void> {
    try {
      const order = await this.findOrderById(id);

      // Return inventory if the order is in a state that reserved inventory
      const inventoryReservingStatuses = [
        OrderStatus.PENDING,
        OrderStatus.PROCESSING,
        OrderStatus.CONFIRMED,
      ];

      if (inventoryReservingStatuses.includes(order.status)) {
        await this.returnInventoryForOrder(
          order,
          this.dataSource.manager
        );
      }

      // Soft delete the order items
      await this.orderItemRepository.softDelete({ orderId: id });

      // Soft delete the order
      await this.orderRepository.softDelete(id);

      this.logger.log(`Order with ID ${id} has been soft-deleted`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`Failed to delete order: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Failed to delete order: ${error.message}`,
      );
    }
  }

  /**
   * Generate invoice PDF for an order
   * @param orderId - The order ID
   * @returns Promise<Buffer> - PDF buffer
   */
  async generateInvoice(orderId: number): Promise<Buffer> {
    try {
      // This is a placeholder for invoice generation
      // In a real implementation, you would use a library like PDFKit to generate a PDF

      const order = await this.findOrderById(orderId);

      // Here would be the PDF generation logic

      return Buffer.from('PDF content would be generated here');
    } catch (error) {
      this.logger.error(`Failed to generate invoice: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Failed to generate invoice: ${error.message}`,
      );
    }
  }
}