
import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { PaginationDto, PaginationOrder, PaginationResultDto } from '../../common/queries/dto';
import { ErrorHelper } from '../../common/utils';
import { Business } from '../businesses/business.entity';
import { Product } from '../product/entity/product.entity';
import { User } from '../users';
import { WalletsService } from '../wallets/wallets.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { FindAllOrdersDto, UpdateOrderItemStatusDto, UpdateOrderStatusDto } from './dto/filter-order.dot';
import { PaymentDtoAdapter } from './dto/payment-dto-adapter.service';
import { InitiatePaymentDto, MonnifyWebhookDto, PaymentCallbackDto, ProcessPaymentDto, VerifyPaymentDto } from './dto/payment.dto';
import { OrderItem } from './entity/order-items.entity';
import { Order } from './entity/order.entity';
import { DeliveryMethod, OrderItemStatus, OrderStatus, PaymentDetails, PaymentMethod, PaymentStatus, SettlementDetails } from './interfaces/order.interface';

const SETTLEMENT_PERCENTAGE = 0.00;
const SETTLEMENT_PERCENTAGE_ORDER = 0.985;


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
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly walletsService: WalletsService,
    private readonly paymentDtoAdapter: PaymentDtoAdapter,
  ) { }


  async createOrder(userId: number, createOrderDto: CreateOrderDto): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const { businessId, items, ...orderData } = createOrderDto;

      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        ErrorHelper.NotFoundException('User not found');
      }

      // Verify business exists
      const business = await this.businessRepository.findOne({
        where: { id: businessId }
      });
      if (!business) {
        ErrorHelper.NotFoundException('Business not found');
      }

      if (business.userId !== userId) {
        ErrorHelper.BadRequestException('You do not have access to this business');
      }

      const productIds = items.map(item => item.productId);

      const products = await this.productRepository.find({
        where: { id: In(productIds) },
        relations: ['sizes']
      });

      const productsMap = new Map(products.map(product => [product.id, product]));

      const orderItems: OrderItem[] = [];
      let subtotal = 0;

      for (const item of items) {
        const { productId, quantity, color, size } = item;
        const product = productsMap.get(productId);

        if (!product) {
          ErrorHelper.NotFoundException(`Product with ID ${productId} not found`);
        }

        if (product.businessId !== businessId) {
          ErrorHelper.BadRequestException(
            `Product with ID ${productId} does not belong to the specified business`,
          );
        }

        if (product.quantityInStock < quantity) {
          ErrorHelper.BadRequestException(
            `Insufficient inventory for product "${product.name}". Requested: ${quantity}, Available: ${product.quantityInStock}`,
          );
        }

        if (product.hasVariation && color && !product.colors.includes(color)) {
          ErrorHelper.BadRequestException(
            `Invalid color "${color}" for product "${product.name}". Available colors: ${product.colors.join(', ')}`,
          );
        }


        if (product.hasVariation && size) {
          const validSizes: string[] = [];

          for (const productSize of product.sizes) {
            if (typeof productSize.value === 'string') {
              validSizes.push(productSize.value);
            } else if (Array.isArray(productSize.value)) {
              validSizes.push(...productSize.value);
            }
          }

          if (!validSizes.includes(size)) {
            ErrorHelper.BadRequestException(
              `Invalid size "${size}" for product "${product.name}". Available sizes: ${validSizes.join(', ')}`,
            );
          }
        }

        const itemSubtotal = product.price * quantity;
        subtotal += itemSubtotal;

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
      const completeOrder = await this.findOrderById(savedOrder.id);

      return completeOrder;
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();

      this.logger.error(`Failed to create order: ${error.message}`, error.stack);

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      ErrorHelper.InternalServerErrorException(
        `Failed to create order: ${error.message}`,
      );
    } finally {
      // Release query runner
      await queryRunner.release();
    }
  }

  private async findOrderByIdentifier(options: {
    id?: number;
    orderReference?: string;
    transactionReference?: string;
    relations?: string[];
    select?: string[];
  }): Promise<Order> {
    try {
      const { id, orderReference, transactionReference, relations = ['items', 'user', 'business'], select } = options;

      // Build the base query
      let qb = this.orderRepository.createQueryBuilder('order');

      // Add join conditions
      if (relations.includes('items')) {
        qb = qb.leftJoinAndSelect('order.items', 'items');
      }

      if (relations.includes('user')) {
        qb = qb.leftJoinAndSelect('order.user', 'user');
      }

      if (relations.includes('business')) {
        qb = qb.leftJoinAndSelect('order.business', 'business');
      }

      // Add where condition based on identifier
      if (id) {
        qb = qb.where('order.id = :id', { id });
      } else if (orderReference) {
        qb = qb.where('order.orderReference = :orderReference', { orderReference });
      } else if (transactionReference) {
        qb = qb.where('order.transactionReference = :transactionReference', { transactionReference });
      } else {
        ErrorHelper.BadRequestException('At least one identifier must be provided');
      }

      // Add select fields if provided
      if (select) {
        const selectFields = ['order'];

        if (relations.includes('user') && select.some(field => field.startsWith('user.'))) {
          selectFields.push(...select.filter(field => field.startsWith('user.')));
        }

        if (relations.includes('business') && select.some(field => field.startsWith('business.'))) {
          selectFields.push(...select.filter(field => field.startsWith('business.')));
        }

        if (relations.includes('items')) {
          selectFields.push('items');
        }

        qb = qb.select(selectFields);
      }

      const order = await qb.getOne();

      // This addresses the Type 'Order | null' is not assignable to type 'Order' error
      if (!order) {
        if (id) {
          ErrorHelper.NotFoundException(`Order with ID ${id} not found`);
        } else if (orderReference) {
          ErrorHelper.NotFoundException(`Order with reference ${orderReference} not found`);
        } else if (transactionReference) {
          ErrorHelper.NotFoundException(`Order with transaction reference ${transactionReference} not found`);
        } else {
          ErrorHelper.NotFoundException(`Order not found`);
        }
      }

      return order;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`Failed to find order: ${error.message}`, error.stack);
      ErrorHelper.InternalServerErrorException(`Failed to find order: ${error.message}`);
    }
  }

  async findOrderById(id: number): Promise<Order> {
    return this.findOrderByIdentifier({
      id,
      select: [
        'order',
        'user.id', 'user.firstName', 'user.lastName', 'user.email',
        'business.id', 'business.businessName', 'business.location', 'business.logo',
        'items'
      ]
    });
  }

  async findOrderByReference(orderReference: string): Promise<Order> {
    return this.findOrderByIdentifier({
      orderReference,
      select: [
        'order',
        'user.id', 'user.firstName', 'user.lastName', 'user.email',
        'business.id', 'business.businessName', 'business.location', 'business.logo',
        'items'
      ]
    });
  }

  async findOrderByTransactionReference(transactionReference: string): Promise<Order> {
    return this.findOrderByIdentifier({
      transactionReference,
      select: [
        'order',
        'user.id', 'user.firstName', 'user.lastName', 'user.email',
        'business.id', 'business.businessName', 'business.location', 'business.logo',
        'items'
      ]
    });
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
      ErrorHelper.InternalServerErrorException(`Failed to find orders: ${error.message}`);
    }
  }

  async findOrdersByUserId(
    userId: number,
    query?: PaginationDto,
  ): Promise<PaginationResultDto<Order>> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });

      if (!user) {
        ErrorHelper.NotFoundException(`User with ID ${userId} not found`);
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
      ErrorHelper.InternalServerErrorException(`Failed to find orders: ${error.message}`);
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
        ErrorHelper.NotFoundException(`Business with ID ${businessId} not found`);
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
      ErrorHelper.InternalServerErrorException(`Failed to find orders: ${error.message}`);
    }
  }


  private normalizeTransactionReference(reference: string, paymentReference?: string): string {
    // Handle Monnify prefixed references (MNFY|XX|DATE|NUMBER)
    if (reference && reference.includes('|')) {
      // Use payment reference if available or extract from the reference
      return paymentReference || reference.split('|').pop() || reference;
    }
    return reference;
  }


  private mapPaymentProviderStatus(providerStatus: string): {
    paymentStatus: PaymentStatus,
    orderStatus: OrderStatus
  } {
    const statusUpper = providerStatus.toUpperCase();

    switch (statusUpper) {
      case 'PAID':
      case 'SUCCESSFUL':
        return {
          paymentStatus: PaymentStatus.PAID,
          orderStatus: OrderStatus.PROCESSING
        };
      case 'PENDING':
        return {
          paymentStatus: PaymentStatus.PENDING,
          orderStatus: OrderStatus.PENDING
        };
      case 'FAILED':
      case 'DECLINED':
      case 'REVERSED':
        return {
          paymentStatus: PaymentStatus.FAILED,
          orderStatus: OrderStatus.PENDING
        };
      case 'EXPIRED':
      case 'ABANDONED':
        return {
          paymentStatus: PaymentStatus.EXPIRED,
          orderStatus: OrderStatus.PENDING
        };
      default:
        return {
          paymentStatus: PaymentStatus.PENDING,
          orderStatus: OrderStatus.PENDING
        };
    }
  }

  private async processOrderPayment(
    order: Order,
    paymentData: {
      paymentMethod: PaymentMethod;
      paymentStatus: PaymentStatus;
      orderStatus: OrderStatus;
      amount?: number;
      paymentReference?: string;
      transactionReference?: string;
      paymentDate?: Date;
      meta?: any;
      provider?: string;
      providerResponse?: any;
    },
    entityManager: EntityManager
  ): Promise<Order> {
    try {
      // Skip processing if payment is already marked as PAID
      if (order.paymentStatus === PaymentStatus.PAID) {
        this.logger.log(`Order ${order.id} is already paid, skipping processing`);
        return order;
      }

      // Construct payment details
      const paymentDetails: PaymentDetails = {
        paymentMethod: paymentData.paymentMethod,
        paymentReference: paymentData.paymentReference || order.transactionReference,
        transactionReference: paymentData.transactionReference || order.transactionReference,
        paymentDate: paymentData.paymentDate || new Date(),
        amount: paymentData.amount || order.total,
        currency: 'NGN',
        meta: paymentData.meta || {},
        provider: paymentData.provider,
        providerResponse: paymentData.providerResponse
      };

      // Update order with payment information
      order.paymentStatus = paymentData.paymentStatus;
      order.status = paymentData.orderStatus;
      order.paymentMethod = paymentData.paymentMethod;
      order.paymentDate = paymentData.paymentDate || new Date();
      order.paymentDetails = paymentDetails;

      // If payment is successful, update order items status
      if (paymentData.paymentStatus === PaymentStatus.PAID) {
        this.logger.log(`Processing successful payment for order ${order.id}`);

        // Update order items status
        for (const item of order.items) {
          item.status = OrderItemStatus.PROCESSING;
          await entityManager.save(OrderItem, item);
        }

        // Handle business settlement for paid orders
        await this.handleBusinessSettlement(order.id, entityManager);
      }

      // Save the updated order
      await entityManager.save(Order, order);

      return order;
    } catch (error) {
      this.logger.error(`Failed to process payment: ${error.message}`, error.stack);
      throw error;
    }
  }


  async initializePayment(initiatePaymentDto: InitiatePaymentDto): Promise<any> {
    try {
      const { orderId, paymentMethod, redirectUrl, metadata } = initiatePaymentDto;

      // Find the order
      const order = await this.findOrderById(orderId);

      if (order.paymentStatus === PaymentStatus.PAID) {
        ErrorHelper.ConflictException('Payment has already been processed for this order');
      }

      const monnifyContractCode = this.configService.get<string>('MONNIFY_CONTRACT_CODE');
      const appUrl = this.configService.get<string>('APP_URL');
      const actualRedirectUrl = redirectUrl || `${appUrl}/orders/payment-callback`;

      if (!monnifyContractCode) {
        ErrorHelper.InternalServerErrorException('Monnify contract code not configured');
      }

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

      const paymentResponse = await this.walletsService.initializeMonnifyPayment(payload);

      await this.orderRepository.update(order.id, {
        paymentStatus: PaymentStatus.INITIATED,
        paymentMethod,
      });

      return {
        success: true,
        message: 'Payment initialized successfully',
        data: {
          ...paymentResponse.responseBody,
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

      ErrorHelper.InternalServerErrorException(`Failed to initialize payment: ${error.message}`);
    }
  }


  async processPayment(processPaymentDto: ProcessPaymentDto): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { orderId, paymentMethod, amount, paymentReference, metadata } = processPaymentDto;

      const order = await this.findOrderById(orderId);

      if (order.paymentStatus === PaymentStatus.PAID) {
        ErrorHelper.ConflictException('Payment has already been processed for this order');
      }

      if (amount < order.total) {
        ErrorHelper.BadRequestException(`Payment amount (${amount}) is less than order total (${order.total})`);
      }

      const transaction = await this.walletsService.verifyMonnifyPayment(order.transactionReference);

      // We need to verify from monfy that it has been paid

      const paymentData = {
        paymentMethod,
        paymentStatus: PaymentStatus.PAID,
        orderStatus: OrderStatus.PROCESSING,
        amount,
        paymentReference,
        paymentDate: new Date(),
        meta: metadata
      };

      await this.processOrderPayment(order, paymentData, queryRunner.manager);

      await queryRunner.commitTransaction();

      return await this.findOrderById(orderId);
    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException) {
        throw error;
      }

      this.logger.error(`Failed to process payment: ${error.message}`, error.stack);
      ErrorHelper.InternalServerErrorException(`Failed to process payment: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }


  async verifyPayment(verifyPaymentDto: VerifyPaymentDto): Promise<any> {
    try {
      const { transactionReference } = verifyPaymentDto;

      let order: Order;
      try {
        order = await this.findOrderByTransactionReference(transactionReference);
      } catch (error) {
        ErrorHelper.NotFoundException(`Order with transaction reference ${transactionReference} not found`);
      }

      const transaction = await this.walletsService.verifyMonnifyPayment(transactionReference);

      if (
        transaction.paymentStatus === 'PAID' &&
        order.paymentStatus !== PaymentStatus.PAID
      ) {
        // Create payment callback data for processing
        const paymentCallbackDto: PaymentCallbackDto = {
          eventType: 'SUCCESSFUL_TRANSACTION',
          eventData: {
            productType: 'COLLECTION',
            transactionReference: transaction.transactionReference,
            paymentReference: transaction.paymentReference,
            amountPaid: transaction.amount,
            totalPayment: transaction.amount,
            settlementAmount: transaction.amount * SETTLEMENT_PERCENTAGE_ORDER,
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

        // Process the payment
        await this.processWebhookEvent(paymentCallbackDto);
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

      ErrorHelper.InternalServerErrorException(`Failed to verify payment: ${error.message}`);
    }
  }

  // ============================================================
  // Webhook and Payment Callback Processing
  // ============================================================

  async processWebhookEvent(webhookData: MonnifyWebhookDto | PaymentCallbackDto): Promise<any> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Convert webhook data to standardized format using adapter
      const standardizedData = this.paymentDtoAdapter.processWebhookData(webhookData);
      const { eventType, eventData } = standardizedData;

      this.logger.log(`Processing webhook event: ${eventType}`);

      // Skip processing if event type is not related to transactions
      if (!eventType.includes('TRANSACTION')) {
        this.logger.warn(`Skipping unsupported event type: ${eventType}`);
        return { processed: false, reason: 'Unsupported event type' };
      }

      const {
        transactionReference,
        paymentReference,
        amountPaid,
        paymentStatus,
        paymentMethod,
        paidOn,
        customer,
        metaData
      } = eventData;

      // Extract the normalized transaction reference
      const orderTransactionReference = this.normalizeTransactionReference(
        transactionReference,
        paymentReference
      );

      this.logger.log(`Looking for order with transaction reference: ${orderTransactionReference}`);

      // Find order by transaction reference
      let order: Order;
      try {
        order = await this.orderRepository.findOne({
          where: [
            { transactionReference: orderTransactionReference },
            { orderReference: paymentReference?.replace('TXN-', 'ORD-') }
          ],
          relations: ['items', 'business'],
        }) as Order;

        if (!order) {
          this.logger.error(`Order not found for transaction: ${orderTransactionReference}`);
          return { processed: false, reason: 'Order not found' };
        }
      } catch (error) {
        this.logger.error(`Error finding order: ${error.message}`);
        return { processed: false, reason: `Error finding order: ${error.message}` };
      }

      this.logger.log(`Found order ${order.id} with reference ${order.orderReference}`);

      // Map provider payment status to our internal status
      const { paymentStatus: mappedPaymentStatus, orderStatus: mappedOrderStatus } =
        this.mapPaymentProviderStatus(paymentStatus);

      // Skip if already paid
      if (order.paymentStatus === PaymentStatus.PAID) {
        this.logger.log(`Order ${order.id} already paid, skipping processing`);
        return { processed: false, reason: 'Payment already processed' };
      }

      // Map the payment method
      const mappedPaymentMethod = this.mapPaymentMethod(paymentMethod);

      // Prepare payment data
      const paymentData = {
        paymentMethod: mappedPaymentMethod,
        paymentStatus: mappedPaymentStatus,
        orderStatus: mappedOrderStatus,
        amount: amountPaid,
        paymentReference,
        transactionReference,
        paymentDate: new Date(paidOn || new Date()),
        meta: metaData || {},
        provider: 'Monnify',
        providerResponse: {
          status: paymentStatus,
          reference: paymentReference,
          transactionId: transactionReference,
          customer,
          amount: amountPaid,
          paymentMethod
        }
      };

      // Process the payment
      await this.processOrderPayment(order, paymentData, queryRunner.manager);

      // Commit the transaction
      await queryRunner.commitTransaction();

      // Send notifications asynchronously (doesn't affect the transaction)
      if (mappedPaymentStatus === PaymentStatus.PAID) {
        this.sendPaymentNotifications(order.id).catch(err => {
          this.logger.error(`Error sending notifications: ${err.message}`);
        });
      }

      this.logger.log(`Successfully processed webhook for order ${order.id}`);
      return {
        processed: true,
        orderId: order.id,
        status: mappedOrderStatus,
        paymentStatus: mappedPaymentStatus
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to process webhook: ${error.message}`, error.stack);

      return {
        processed: false,
        error: error.message
      };
    } finally {
      await queryRunner.release();
    }
  }


  async processPaymentWebhook(webhookData: MonnifyWebhookDto): Promise<any> {
    this.logger.log(`Received payment webhook: ${webhookData.eventType}`);

    try {
      return await this.processWebhookEvent(webhookData);
    } catch (error) {
      this.logger.error(`Error processing webhook: ${error.message}`, error.stack);

      return {
        processed: false,
        error: error.message
      };
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

      const order = await this.findOrderById(orderId);

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

      ErrorHelper.InternalServerErrorException(`Failed to update order status: ${error.message}`);
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
      const order = await this.findOrderById(orderId);

      // Find the order item
      const item = order.items.find(item => item.id === itemId);

      if (!item) {
        ErrorHelper.NotFoundException(`Order item with ID ${itemId} not found in order ${orderId}`);
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

      ErrorHelper.InternalServerErrorException(`Failed to update order item status: ${error.message}`);
    } finally {
      // Release query runner
      await queryRunner.release();
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
      ErrorHelper.InternalServerErrorException(`Failed to delete order: ${error.message}`);
    }
  }


  private async handleBusinessSettlement(
    orderId: number,
    entityManager: EntityManager
  ): Promise<void> {
    try {
      const order = await entityManager.findOne(Order, {
        where: { id: orderId },
        relations: ['business', 'items', 'business.user'],
      });

      if (!order || order.paymentStatus !== PaymentStatus.PAID) {
        return;
      }

      if (order.isBusinessSettled) {
        return;
      }

      const business = order.business;

      const platformFeePercentage = SETTLEMENT_PERCENTAGE;
      const platformFee = order.total * platformFeePercentage;
      const payoutAmount = order.total - platformFee;

      const settlementReference = `STL-${uuidv4().substring(0, 8).toUpperCase()}`;

      const settlementDetails: SettlementDetails = {
        businessId: business.id,
        businessName: business.businessName,
        amount: order.total,
        platformFee,
        settlementAmount: payoutAmount,
        reference: settlementReference,
        status: 'PENDING',
        settlementDate: new Date(),
      };

      // Mark order as PENDING settlement
      order.isBusinessSettled = true;
      order.settlementReference = settlementReference;
      order.settlementDate = new Date();
      order.settlementDetails = settlementDetails;

      await entityManager.save(Order, order);

      this.logger.log(
        `Business settlement initiated for order ${orderId}, business ${business.id}, amount ${payoutAmount}`,
      );

      // --- Perform the transfer asynchronously ---
      this.walletsService.transferToWalletOrBank({
        amount: payoutAmount,
        reference: settlementReference,
        narration: `Settlement for order ${order.id}`,
        destinationAccountNumber: business.user.walletAccountNumber,
        destinationBankCode: business.user.walletBankCode,
        sourceAccountNumber: process.env.MONNIFY_WALLET_ACCOUNT,
        async: false,
      })
        .then(async transferResponse => {
          if (transferResponse.status === 'SUCCESS') {
            order.settlementDetails.status = 'COMPLETED';
            this.logger.log(
              `Business settlement successful for order ${orderId}, reference: ${settlementReference}`,
            );
          } else {
            order.settlementDetails.status = 'FAILED';
            this.logger.error(
              `Business settlement failed for order ${orderId}: ${JSON.stringify(transferResponse.responseBody)}`,
            );
          }

          await entityManager.save(Order, order);
        })
        .catch(async err => {
          order.settlementDetails.status = 'FAILED';
          await entityManager.save(Order, order);
          this.logger.error(`Settlement transfer error for order ${orderId}: ${err.message}`, err.stack);
        });

    } catch (error) {
      this.logger.error(`Failed to process business settlement: ${error.message}`, error.stack);
      throw error;
    }
  }


  private async returnInventoryForOrder(
    order: Order,
    entityManager: EntityManager,
  ): Promise<void> {
    try {
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


  private async sendPaymentNotifications(orderId: number): Promise<void> {
    try {
      const order = await this.findOrderById(orderId);

      if (!order || order.paymentStatus !== PaymentStatus.PAID) {
        return;
      }

      // Send customer confirmation
      // You could implement an email service or use a third-party service
      // this.emailService.sendPaymentConfirmation({
      //   to: order.customerEmail,
      //   name: order.customerName,
      //   orderReference: order.orderReference,
      //   amount: order.total,
      //   items: order.items.length,
      //   date: order.paymentDate
      // });

      // Notify business owner
      if (order.business) {
        // this.notificationService.notifyBusiness({
        //   businessId: order.business.id,
        //   type: 'NEW_PAID_ORDER',
        //   message: `New paid order #${order.orderReference} for ${order.total} NGN`,
        //   data: {
        //     orderId: order.id,
        //     amount: order.total,
        //     customerName: order.customerName
        //   }
        // });
      }

      this.logger.log(`Notifications sent for order ${orderId}`);
    } catch (error) {
      this.logger.error(`Error sending notifications: ${error.message}`, error.stack);
      // Don't rethrow to prevent stopping the process
    }
  }

  private calculateShippingFee(deliveryMethod: DeliveryMethod): number {
    switch (deliveryMethod) {
      case DeliveryMethod.EXPRESS:
        return 0;
      case DeliveryMethod.STANDARD:
        return 0;
      case DeliveryMethod.PICKUP:
        return 0;
      default:
        return 0;
    }
  }

  private calculateTax(subtotal: number): number {
    return subtotal * 0;
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
      [OrderStatus.COMPLETED]:[]
    };

    // Allow same status (no change)
    if (currentStatus === newStatus) {
      return;
    }

    if (!validTransitions[currentStatus].includes(newStatus)) {
      ErrorHelper.BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}. Valid transitions: ${validTransitions[currentStatus].join(', ')}`,
      );
    }
  }

  async generateInvoice(orderId: number): Promise<Buffer> {
    try {
      // This is a placeholder for invoice generation
      // In a real implementation, you would use a library like PDFKit to generate a PDF

      const order = await this.findOrderById(orderId);

      // Here would be the PDF generation logic

      return Buffer.from('PDF content would be generated here');
    } catch (error) {
      this.logger.error(`Failed to generate invoice: ${error.message}`, error.stack);
      ErrorHelper.InternalServerErrorException(`Failed to generate invoice: ${error.message}`);
    }
  }
}

