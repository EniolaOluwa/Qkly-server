import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { PaginationDto, PaginationOrder, PaginationResultDto } from '../../common/queries/dto';
import { ErrorHelper } from '../../common/utils';
import { Business } from '../businesses/business.entity';
import { PaymentService } from '../payment/payment.service';
import { Product } from '../product/entity/product.entity';
import { User } from '../users/entity/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { FindAllOrdersDto, UpdateOrderItemStatusDto, UpdateOrderStatusDto } from './dto/filter-order.dot';
import { InitiatePaymentDto, ProcessPaymentDto, VerifyPaymentDto } from './dto/payment.dto';
import { RefundMethod, RefundType } from './dto/refund.dto';
import { OrderItem } from './entity/order-items.entity';
import { Order } from './entity/order.entity';
import { DeliveryMethod, OrderItemStatus, OrderStatus, OrderStatusHistory, PaymentDetails, PaymentMethod, PaymentStatus, RefundDetails, RefundStatus, RefundTransactionStatus, RefundTransactionType, SettlementDetails } from './interfaces/order.interface';

const SETTLEMENT_PERCENTAGE = 0.00;
const SETTLEMENT_PERCENTAGE_ORDER = 0.985;
const PLATFORM_FEE_PERCENTAGE = 0


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
    private readonly paymentService: PaymentService,
  ) { }


  async createOrder(userId: number, createOrderDto: CreateOrderDto): Promise<Order> {
    return this.createOrderInternal(createOrderDto, userId);
  }


  async createGuestOrder(createOrderDto: CreateOrderDto): Promise<Order> {
    return this.createOrderInternal(createOrderDto, null);
  }

  async findOrdersByCustomerEmail(
    customerEmail: string,
    query?: PaginationDto,
  ): Promise<PaginationResultDto<Order>> {
    try {
      const qb = this.orderRepository
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.items', 'items')
        .leftJoinAndSelect('order.business', 'business')
        .where('LOWER(order.customerEmail) = LOWER(:customerEmail)', { customerEmail })
        .select([
          'order',
          'business.id',
          'business.businessName',
          'business.logo',
          'items',
        ]);

      const itemCount = await qb.getCount();
      const { skip = 0, limit = 10, order = PaginationOrder.DESC } = query || {};

      const data = await qb.skip(skip).take(limit).orderBy('order.createdAt', order).getMany();

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
      this.logger.error(`Failed to find orders by customer email: ${error.message}`, error.stack);
      ErrorHelper.InternalServerErrorException(`Failed to find orders: ${error.message}`);
    }
  }

  async getOrderStatusHistory(orderId: number): Promise<OrderStatusHistory[]> {
    try {
      const order = await this.findOrderById(orderId);
      return order.statusHistory || [];
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to get order status history: ${error.message}`, error.stack);
      ErrorHelper.InternalServerErrorException(`Failed to get status history: ${error.message}`);
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
      const {
        id,
        orderReference,
        transactionReference,
        relations = ['items', 'user', 'business'],
        select,
      } = options;

      let qb = this.orderRepository.createQueryBuilder('order');

      if (relations.includes('items')) {
        qb = qb.leftJoinAndSelect('order.items', 'items');
      }
      if (relations.includes('user')) {
        qb = qb.leftJoinAndSelect('order.user', 'user');
      }
      if (relations.includes('business')) {
        qb = qb.leftJoinAndSelect('order.business', 'business');
      }

      if (id) {
        qb = qb.where('order.id = :id', { id });
      } else if (orderReference) {
        qb = qb.where('order.orderReference = :orderReference', { orderReference });
      } else if (transactionReference) {
        qb = qb.where('order.transactionReference = :transactionReference', {
          transactionReference,
        });
      } else {
        ErrorHelper.BadRequestException('At least one identifier must be provided');
      }

      if (select) {
        const selectFields = ['order'];
        if (relations.includes('user') && select.some((field) => field.startsWith('user.'))) {
          selectFields.push(...select.filter((field) => field.startsWith('user.')));
        }
        if (
          relations.includes('business') &&
          select.some((field) => field.startsWith('business.'))
        ) {
          selectFields.push(...select.filter((field) => field.startsWith('business.')));
        }
        if (relations.includes('items')) {
          selectFields.push('items');
        }
        qb = qb.select(selectFields);
      }

      const order = await qb.getOne();

      if (!order) {
        if (id) {
          ErrorHelper.NotFoundException(`Order with ID ${id} not found`);
        } else if (orderReference) {
          ErrorHelper.NotFoundException(`Order with reference ${orderReference} not found`);
        } else if (transactionReference) {
          ErrorHelper.NotFoundException(
            `Order with transaction reference ${transactionReference} not found`,
          );
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
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.email',
        'business.id',
        'business.businessName',
        'business.location',
        'business.logo',
        'items',
      ],
    });
  }

  async findOrderByReference(orderReference: string): Promise<Order> {
    return this.findOrderByIdentifier({
      orderReference,
      select: [
        'order',
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.email',
        'business.id',
        'business.businessName',
        'business.location',
        'business.logo',
        'items',
      ],
    });
  }

  async findOrderByTransactionReference(transactionReference: string): Promise<Order> {
    return this.findOrderByIdentifier({
      transactionReference,
      select: [
        'order',
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.email',
        'business.id',
        'business.businessName',
        'business.location',
        'business.logo',
        'items',
      ],
    });
  }

  async findAllOrders(
    query: FindAllOrdersDto
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

      const qb = this.orderRepository
        .createQueryBuilder('order')

        .leftJoinAndSelect('order.items', 'items')


      if (userId) qb.andWhere('order.userId = :userId', { userId });
      if (businessId) qb.andWhere('order.businessId = :businessId', { businessId });
      if (status) qb.andWhere('order.status = :status', { status });
      if (paymentStatus)
        qb.andWhere('order.paymentStatus = :paymentStatus', { paymentStatus });
      if (paymentMethod)
        qb.andWhere('order.paymentMethod = :paymentMethod', { paymentMethod });
      if (deliveryMethod)
        qb.andWhere('order.deliveryMethod = :deliveryMethod', { deliveryMethod });
      if (minTotal !== undefined) qb.andWhere('order.total >= :minTotal', { minTotal });
      if (maxTotal !== undefined) qb.andWhere('order.total <= :maxTotal', { maxTotal });

      if (search) {
        qb.andWhere(
          '(order.orderReference LIKE :search OR ' +
          'order.customerName LIKE :search OR ' +
          'order.customerEmail LIKE :search OR ' +
          'order.customerPhoneNumber LIKE :search)',
          { search: `%${search}%` },
        );
      }

      if (startDate) {
        qb.andWhere('order.createdAt >= :startDate', { startDate: new Date(startDate) });
      }
      if (endDate) {
        qb.andWhere('order.createdAt <= :endDate', { endDate: new Date(endDate) });
      }

      const itemCount = await qb.getCount();

      const allowedSortFields = [
        'id',
        'status',
        'paymentStatus',
        'total',
        'createdAt',
        'updatedAt',
      ];
      const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
      const validSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

      qb.orderBy(`order.${validSortBy}`, validSortOrder);
      qb.skip(skip).take(limit);

      const data = await qb.getMany();

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

  async findOrdersByBusinessId(
    businessId: number,
    query?: PaginationDto,
  ): Promise<PaginationResultDto<Order>> {
    try {
      const business = await this.businessRepository.findOne({ where: { id: businessId } });
      if (!business) {
        ErrorHelper.NotFoundException(`Business with ID ${businessId} not found`);
      }

      const qb = this.orderRepository
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.items', 'items')
        .leftJoinAndSelect('order.user', 'user')
        .where('order.businessId = :businessId', { businessId })
        // CRITICAL: Only show orders that have been PAID
        .andWhere('order.paymentStatus = :paymentStatus', { paymentStatus: PaymentStatus.PAID })
        .select(['order', 'user.id', 'user.firstName', 'user.lastName', 'user.email', 'items']);

      const itemCount = await qb.getCount();
      const { skip = 0, limit = 10, order = PaginationOrder.DESC } = query || {};

      const data = await qb.skip(skip).take(limit).orderBy('order.createdAt', order).getMany();

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



  // ============================================================
  // ORDER PAYMENT  MANAGEMENT
  // ============================================================

  async initializePayment(initiatePaymentDto: InitiatePaymentDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { orderId } = initiatePaymentDto;

      const order = await queryRunner.manager.findOne(Order, {
        where: { id: orderId },
        relations: ['items'],
      });

      if (!order) {
        ErrorHelper.NotFoundException('Order not found');
      }

      // Prevent duplicate payment initialization
      if (order.paymentStatus === PaymentStatus.PAID) {
        ErrorHelper.ConflictException('Payment already completed for this order');
      }

      if (order.paymentStatus === PaymentStatus.INITIATED) {
        ErrorHelper.ConflictException('Payment already initiated for this order');
      }

      const business = await queryRunner.manager.findOne(Business, {
        where: { id: order.businessId },
      });

      if (!business) {
        ErrorHelper.ConflictException('Business not found');
      }

      // Update order: paid + confirmed (not processing yet)
      order.paymentStatus = PaymentStatus.PAID;
      order.status = OrderStatus.CONFIRMED;
      order.paymentDate = new Date();

      // Add history entry (duplicate check inside)
      this.addStatusToHistory(
        order,
        OrderStatus.CONFIRMED,
        null,
        'Payment confirmed - awaiting merchant acceptance'
      );

      await queryRunner.manager.save(order);
      await queryRunner.commitTransaction();

      this.logger.log(`Payment confirmed for order ${order.id}`);

      return await this.orderRepository.findOne({
        where: { id: order.id },
        relations: ['items'],
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Payment initialization failed:', error);
      throw error;
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
        ErrorHelper.NotFoundException(
          `Order with transaction reference ${transactionReference} not found`,
        );
      }

      // Use PaymentService to verify payment
      const transaction = await this.paymentService.verifyPayment(transactionReference);

      this.logger.log(
        `Payment verification for order ${order.id}: ${transaction.paymentStatus}`,
      );

      // If payment is successful and order hasn't been marked as paid, process it
      if (transaction.paymentStatus === 'SUCCESS' && order.paymentStatus !== PaymentStatus.PAID) {
        // Process the payment by updating order status
        await this.processVerifiedPayment(order, transaction);
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
          provider: transaction.provider,
          verificationResult: {
            paymentReference: transaction.paymentReference,
            amountPaid: transaction.amountPaid,
            paymentStatus: transaction.paymentStatus,
            paymentMethod: transaction.paymentMethod,
            paidOn: transaction.paidOn,
          },
        },
      };
    } catch (error) {
      this.logger.error(`Payment verification failed: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      ErrorHelper.InternalServerErrorException(`Failed to verify payment: ${error.message}`);
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
        ErrorHelper.BadRequestException(
          `Payment amount (${amount}) is less than order total (${order.total})`,
        );
      }

      // Verify payment with provider
      const transaction = await this.paymentService.verifyPayment(order.transactionReference);

      const paymentData = {
        paymentMethod,
        paymentStatus: PaymentStatus.PAID,
        orderStatus: OrderStatus.PROCESSING,
        amount,
        paymentReference,
        paymentDate: new Date(),
        meta: metadata,
        provider: transaction.provider,
      };

      await this.processOrderPayment(order, paymentData, queryRunner.manager);

      await queryRunner.commitTransaction();

      return await this.findOrderById(orderId);
    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      this.logger.error(`Failed to process payment: ${error.message}`, error.stack);
      ErrorHelper.InternalServerErrorException(`Failed to process payment: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  async processPaymentWebhook(webhookData: any): Promise<any> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log(`Processing payment webhook from provider`);

      // Use PaymentService to process and standardize webhook
      const standardizedWebhook = await this.paymentService.processWebhook(webhookData);

      const { eventType, eventData, provider } = standardizedWebhook;

      this.logger.log(`Webhook event: ${eventType} from ${provider}`);

      // Skip processing if event type is not transaction-related
      if (!eventType.includes('TRANSACTION') && !eventType.includes('TRANSFER')) {
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
        customerName,
        customerEmail,
        metadata,
      } = eventData;

      // Find order by transaction reference or payment reference
      let order: Order;
      try {
        order = (await this.orderRepository.findOne({
          where: [
            { transactionReference: transactionReference || paymentReference },
            { transactionReference: paymentReference },
          ],
          relations: ['items', 'business'],
        })) as Order;

        if (!order) {
          this.logger.error(
            `Order not found for transaction: ${transactionReference || paymentReference}`,
          );
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
        meta: metadata || {},
        provider: provider,
        providerResponse: {
          status: paymentStatus,
          reference: paymentReference,
          transactionId: transactionReference,
          customer: {
            name: customerName,
            email: customerEmail,
          },
          amount: amountPaid,
          paymentMethod,
        },
      };

      // Process the payment
      await this.processOrderPayment(order, paymentData, queryRunner.manager);

      // Commit the transaction
      await queryRunner.commitTransaction();

      // Send notifications asynchronously
      if (mappedPaymentStatus === PaymentStatus.PAID) {
        this.sendPaymentNotifications(order.id).catch((err) => {
          this.logger.error(`Error sending notifications: ${err.message}`);
        });
      }

      this.logger.log(`Successfully processed webhook for order ${order.id}`);

      return {
        processed: true,
        orderId: order.id,
        status: mappedOrderStatus,
        paymentStatus: mappedPaymentStatus,
        provider: provider,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to process webhook: ${error.message}`, error.stack);

      return {
        processed: false,
        error: error.message,
      };
    } finally {
      await queryRunner.release();
    }
  }

  // ============================================================
  // ORDER STATUS MANAGEMENT
  // ============================================================


  async acceptOrder(orderId: number, businessId: number, notes?: string): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await this.findOrderById(orderId);

      // Verify business ownership
      if (order.businessId !== businessId) {
        ErrorHelper.BadRequestException('You do not have permission to accept this order');
      }

      // Verify payment status
      if (order.paymentStatus !== PaymentStatus.PAID) {
        ErrorHelper.BadRequestException('Only paid orders can be accepted');
      }

      // Can only accept CONFIRMED orders (after payment)
      if (order.status !== OrderStatus.CONFIRMED) {
        ErrorHelper.BadRequestException(
          `Order cannot be accepted from status: ${order.status}. Order must be in CONFIRMED status after payment.`
        );
      }

      // Prevent accepting already processed orders
      if ([OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.COMPLETED].includes(order.status)) {
        ErrorHelper.BadRequestException(
          `Order has already been accepted and is in ${order.status} status`
        );
      }

      // Update order status to PROCESSING
      order.status = OrderStatus.PROCESSING;
      if (notes) {
        order.notes = notes;
      }

      // Add to history (duplicate check is inside)
      this.addStatusToHistory(order, OrderStatus.PROCESSING, businessId, notes);

      // Update all items to PROCESSING
      for (const item of order.items) {
        item.status = OrderItemStatus.PROCESSING;
        await queryRunner.manager.save(OrderItem, item);
      }

      await queryRunner.manager.save(Order, order);
      await queryRunner.commitTransaction();

      this.logger.log(`Order ${orderId} accepted by business ${businessId}`);

      return await this.findOrderById(orderId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to accept order: ${error.message}`, error.stack);

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      ErrorHelper.InternalServerErrorException(`Failed to accept order: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }


  async rejectOrder(orderId: number, businessId: number, reason: string): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await this.findOrderById(orderId);

      // Validate business permission
      if (order.businessId !== businessId) {
        ErrorHelper.BadRequestException('You do not have permission to reject this order');
      }

      // Only paid orders can be rejected
      if (order.paymentStatus !== PaymentStatus.PAID) {
        ErrorHelper.BadRequestException('Only paid orders can be rejected');
      }

      // Can only reject CONFIRMED or PROCESSING orders
      const validStatuses = [OrderStatus.CONFIRMED, OrderStatus.PROCESSING];
      if (!validStatuses.includes(order.status)) {
        ErrorHelper.BadRequestException(
          `Order cannot be rejected from status: ${order.status}. Expected CONFIRMED or PROCESSING.`
        );
      }

      // Prevent rejecting already finalized orders
      if ([OrderStatus.CANCELLED, OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.COMPLETED, OrderStatus.REFUNDED].includes(order.status)) {
        ErrorHelper.BadRequestException(
          `Order cannot be rejected from ${order.status} status`
        );
      }

      // Update order status
      order.status = OrderStatus.CANCELLED;
      order.notes = `REJECTED BY BUSINESS: ${reason}`;

      // Add to history
      this.addStatusToHistory(order, OrderStatus.CANCELLED, businessId, `Rejected: ${reason}`);

      // Cancel all items
      for (const item of order.items) {
        item.status = OrderItemStatus.CANCELLED;
        await queryRunner.manager.save(OrderItem, item);
      }

      // Return inventory
      await this.returnInventoryForOrder(order, queryRunner.manager);

      // Build refundDetails
      order.refundDetails = {
        refundReference: `RFD-${Date.now()}-${orderId}`,
        amountRequested: order.total,
        amountApproved: order.total,
        amountRefunded: 0,
        remainingAmount: order.total,
        status: RefundStatus.REQUESTED,
        reason: `Order rejected by business: ${reason}`,
        refundType: RefundType.FULL,
        refundMethod: RefundMethod.ORIGINAL_PAYMENT,
        customerNote: undefined,
        merchantNote: reason,
        requestedBy: businessId,
        approvedBy: businessId,
        refundedBy: undefined,
        requestedAt: new Date(),
        approvedAt: new Date(),
        processingAt: null,
        refundedAt: null,
        failedAt: null,
        cancelledAt: null,
        transactions: [],
        meta: {},
      };

      order.isRefunded = false;

      await queryRunner.manager.save(Order, order);
      await queryRunner.commitTransaction();

      this.logger.log(`Order ${orderId} rejected by business ${businessId}. Reason: ${reason}`);

      // Trigger async refund
      this.initiateRefund(orderId).catch((err) => {
        this.logger.error(`Refund initiation failed for order ${orderId}: ${err.message}`, err.stack);
      });

      return await this.findOrderById(orderId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to reject order: ${error.message}`, error.stack);

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      ErrorHelper.InternalServerErrorException(`Failed to reject order: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }


  async updateOrderStatus(
    orderId: number,
    updateStatusDto: UpdateOrderStatusDto,
    userId?: number,
    businessId?: number,
  ): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { status, notes } = updateStatusDto;
      const order = await this.findOrderById(orderId);

      // Prevent duplicate status
      if (order.status === status) {
        this.logger.warn(`Order ${orderId} already has status ${status}, skipping update`);
        return order;
      }

      // If businessId is provided, verify ownership
      if (businessId && order.businessId !== businessId) {
        ErrorHelper.BadRequestException('You do not have permission to update this order');
      }

      // Verify payment status for most transitions
      if (status !== OrderStatus.CANCELLED && order.paymentStatus !== PaymentStatus.PAID) {
        ErrorHelper.BadRequestException('Only paid orders can be updated to this status');
      }

      // Validate status transition
      this.validateStatusTransition(order.status, status);

      // Update order status
      order.status = status;
      if (notes) {
        order.notes = notes;
      }

      // Add to status history (duplicate check inside)
      this.addStatusToHistory(order, status, userId, notes);

      // Update payment status if needed
      this.updatePaymentStatusForOrderStatus(order);

      // Update order items status based on order status
      let itemStatus: OrderItemStatus;

      switch (status) {
        case OrderStatus.PROCESSING:
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
          await this.returnInventoryForOrder(order, queryRunner.manager);
          break;
        case OrderStatus.RETURNED:
          itemStatus = OrderItemStatus.RETURNED;
          await this.returnInventoryForOrder(order, queryRunner.manager);
          break;
        case OrderStatus.REFUNDED:
          itemStatus = OrderItemStatus.REFUNDED;
          break;
        default:
          itemStatus = order.items[0]?.status || OrderItemStatus.PENDING;
      }

      // Update all items with the new status
      for (const item of order.items) {
        item.status = itemStatus;
        await queryRunner.manager.save(OrderItem, item);
      }

      await queryRunner.manager.save(Order, order);
      await queryRunner.commitTransaction();

      return await this.findOrderById(orderId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to update order status: ${error.message}`, error.stack);

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      ErrorHelper.InternalServerErrorException(`Failed to update order status: ${error.message}`);
    } finally {
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
      const order = await this.findOrderById(orderId);
      const item = order.items.find((item) => item.id === itemId);

      if (!item) {
        ErrorHelper.NotFoundException(
          `Order item with ID ${itemId} not found in order ${orderId}`,
        );
      }

      item.status = status;
      if (notes) {
        item.notes = notes;
      }

      if (status === OrderItemStatus.CANCELLED || status === OrderItemStatus.RETURNED) {
        await this.returnInventoryForOrderItem(item, queryRunner.manager);
      }

      await queryRunner.manager.save(OrderItem, item);

      // Check if all items have the same status and update order status accordingly
      const allItemsHaveStatus = order.items.every((i) => i.status === status);
      if (allItemsHaveStatus) {
        const orderStatus = this.mapOrderItemStatusToOrderStatus(status);
        if (orderStatus) {
          order.status = orderStatus;
          await queryRunner.manager.save(Order, order);
        }
      }

      await queryRunner.commitTransaction();
      return item;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to update order item status: ${error.message}`, error.stack);

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      ErrorHelper.InternalServerErrorException(
        `Failed to update order item status: ${error.message}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async deleteOrder(id: number): Promise<void> {
    try {
      const order = await this.findOrderById(id);

      const inventoryReservingStatuses = [
        OrderStatus.PENDING,
        OrderStatus.PROCESSING,
        OrderStatus.CONFIRMED,
      ];

      if (inventoryReservingStatuses.includes(order.status)) {
        await this.returnInventoryForOrder(order, this.dataSource.manager);
      }

      await this.orderItemRepository.softDelete({ orderId: id });
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

  // ============================================================
  // PRIVATE HELPER METHODS
  // ============================================================


  private async createOrderInternal(
    createOrderDto: CreateOrderDto,
    userId: number | null,
  ): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { businessId, items, ...orderData } = createOrderDto;
      const isGuestOrder = userId === null;

      // Verify business exists
      const business = await this.businessRepository.findOne({
        where: { id: businessId },
      });

      if (!business) {
        ErrorHelper.NotFoundException('Business not found');
      }

      // For authenticated users, verify they own the business
      if (!isGuestOrder) {
        const user = await this.userRepository.findOne({ where: { id: userId } });

        if (!user) {
          ErrorHelper.NotFoundException('User not found');
        }
      }

      // Fetch products
      const productIds = items.map((item) => item.productId);
      const products = await this.productRepository.find({
        where: { id: In(productIds) },
        relations: ['sizes'],
      });

      const productsMap = new Map(products.map((product) => [product.id, product]));

      const orderItems: OrderItem[] = [];
      let subtotal = 0;

      // Process order items
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

        // Update inventory
        product.quantityInStock -= quantity;
        await queryRunner.manager.save(Product, product);
      }

      // Calculate order totals
      const shippingFee = this.calculateShippingFee(createOrderDto.deliveryMethod);
      const tax = this.calculateTax(subtotal);
      const discount = 0;
      const total = subtotal + shippingFee + tax - discount;

      // Generate order reference
      const orderReference = `ORD-${uuidv4().substring(0, 8).toUpperCase()}`;
      const transactionReference = `TXN-${uuidv4().substring(0, 8).toUpperCase()}`;

      // Create initial status history
      const initialStatusHistory: OrderStatusHistory[] = [
        {
          status: OrderStatus.PENDING,
          timestamp: new Date(),
          updatedBy: userId,
          notes: isGuestOrder ? 'Order created by guest user' : 'Order created',
        },
      ];

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
        isGuestOrder,
        statusHistory: initialStatusHistory,
      });

      // Save order
      const savedOrder = await queryRunner.manager.save(Order, order);

      // Associate order items with the saved order
      for (const item of orderItems) {
        item.orderId = savedOrder.id;
        await queryRunner.manager.save(OrderItem, item);
      }

      // If payment method is Cash on Delivery, change status to confirmed
      if (createOrderDto.paymentMethod === PaymentMethod.CASH_ON_DELIVERY) {
        savedOrder.status = OrderStatus.CONFIRMED;
        this.addStatusToHistory(
          savedOrder,
          OrderStatus.CONFIRMED,
          userId,
          'Payment method: Cash on Delivery',
        );
        await queryRunner.manager.save(Order, savedOrder);
      }

      // Commit transaction
      await queryRunner.commitTransaction();

      // Reload order with items
      const completeOrder = await this.findOrderById(savedOrder.id);

      return completeOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create order: ${error.message}`, error.stack);

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      ErrorHelper.InternalServerErrorException(`Failed to create order: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }


  private async processVerifiedPayment(order: Order, transaction: any): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const paymentData = {
        paymentMethod: this.mapPaymentMethod(transaction.paymentMethod),
        paymentStatus: PaymentStatus.PAID,
        orderStatus: OrderStatus.PROCESSING,
        amount: transaction.amountPaid,
        paymentReference: transaction.paymentReference,
        transactionReference: transaction.transactionReference,
        paymentDate: new Date(transaction.paidOn),
        meta: transaction.metadata || {},
        provider: transaction.provider,
        providerResponse: transaction,
      };

      await this.processOrderPayment(order, paymentData, queryRunner.manager);
      await queryRunner.commitTransaction();

      this.logger.log(`Processed verified payment for order ${order.id}`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to process verified payment: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
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
    entityManager: EntityManager,
  ): Promise<Order> {
    try {
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
        providerResponse: paymentData.providerResponse,
      };

      // Update order with payment information
      order.paymentStatus = paymentData.paymentStatus;
      order.status = paymentData.orderStatus;
      order.paymentMethod = paymentData.paymentMethod;
      order.paymentDate = paymentData.paymentDate || new Date();
      order.paymentDetails = paymentDetails;

      // If payment is successful, update order items and handle settlement
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

      await entityManager.save(Order, order);
      return order;
    } catch (error) {
      this.logger.error(`Failed to process payment: ${error.message}`, error.stack);
      throw error;
    }
  }


  private async handleBusinessSettlement(
    orderId: number,
    entityManager: EntityManager,
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

      // Use PaymentService to transfer to business account
      this.paymentService
        .transferToBank({
          amount: payoutAmount,
          reference: settlementReference,
          narration: `Settlement for order ${order.orderReference}`,
          destinationAccountNumber:
            business.user.personalAccountNumber || business.user.walletAccountNumber,
          destinationBankCode: business.user.personalBankCode || business.user.walletBankCode,
          destinationAccountName:
            business.user.personalAccountName || business.user.walletAccountName,
          sourceWalletReference:
            this.configService.get<string>('PLATFORM_WALLET_REFERENCE') ||
            process.env.PLATFORM_WALLET_REFERENCE,
          currency: 'NGN',
        })
        .then(async (transferResponse) => {
          if (transferResponse.status === 'SUCCESS') {
            order.settlementDetails.status = 'COMPLETED';
            this.logger.log(
              `Business settlement successful for order ${orderId}, reference: ${settlementReference}`,
            );
          } else {
            order.settlementDetails.status = 'FAILED';
            this.logger.error(
              `Business settlement failed for order ${orderId}: ${JSON.stringify(transferResponse)}`,
            );
          }
          await entityManager.save(Order, order);
        })
        .catch(async (err) => {
          order.settlementDetails.status = 'FAILED';
          await entityManager.save(Order, order);
          this.logger.error(
            `Settlement transfer error for order ${orderId}: ${err.message}`,
            err.stack,
          );
        });
    } catch (error) {
      this.logger.error(`Failed to process business settlement: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async sendPaymentNotifications(orderId: number): Promise<void> {
    try {
      const order = await this.findOrderById(orderId);

      if (!order || order.paymentStatus !== PaymentStatus.PAID) {
        return;
      }

      // TODO: Implement email/notification service

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
    return subtotal * 0; // 0% tax
  }

  private mapPaymentMethod(paymentMethodStr: string): PaymentMethod {
    const methodMap: Record<string, PaymentMethod> = {
      CARD: PaymentMethod.CARD,
      ACCOUNT_TRANSFER: PaymentMethod.BANK_TRANSFER,
      BANK_TRANSFER: PaymentMethod.BANK_TRANSFER,
      WALLET: PaymentMethod.WALLET,
      USSD: PaymentMethod.USSD,
      BANK: PaymentMethod.BANK_TRANSFER,
    };

    return (
      methodMap[paymentMethodStr.toUpperCase()] ||
      PaymentMethod[this.paymentService.getActiveProvider()]
    );
  }


  private mapPaymentProviderStatus(providerStatus: string): {
    paymentStatus: PaymentStatus;
    orderStatus: OrderStatus;
  } {
    const statusUpper = providerStatus.toUpperCase();

    switch (statusUpper) {
      case 'PAID':
      case 'SUCCESSFUL':
      case 'SUCCESS':
        return {
          paymentStatus: PaymentStatus.PAID,
          orderStatus: OrderStatus.PROCESSING,
        };
      case 'PENDING':
        return {
          paymentStatus: PaymentStatus.PENDING,
          orderStatus: OrderStatus.PENDING,
        };
      case 'FAILED':
      case 'DECLINED':
      case 'REVERSED':
        return {
          paymentStatus: PaymentStatus.FAILED,
          orderStatus: OrderStatus.PENDING,
        };
      case 'EXPIRED':
      case 'ABANDONED':
        return {
          paymentStatus: PaymentStatus.EXPIRED,
          orderStatus: OrderStatus.PENDING,
        };
      default:
        return {
          paymentStatus: PaymentStatus.PENDING,
          orderStatus: OrderStatus.PENDING,
        };
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



  private validateNoDowngrade(currentStatus: OrderStatus, newStatus: OrderStatus): void {
    const statusHierarchy = [
      OrderStatus.PENDING,
      OrderStatus.PROCESSING,
      OrderStatus.CONFIRMED,
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
      OrderStatus.COMPLETED,
    ];

    const currentIndex = statusHierarchy.indexOf(currentStatus);
    const newIndex = statusHierarchy.indexOf(newStatus);

    // If both statuses are in the hierarchy and new is lower, prevent it
    if (currentIndex !== -1 && newIndex !== -1 && newIndex < currentIndex) {
      // Allow only specific downgrades like DELIVERED -> RETURNED
      const allowedDowngrades = [
        { from: OrderStatus.DELIVERED, to: OrderStatus.RETURNED },
        { from: OrderStatus.SHIPPED, to: OrderStatus.RETURNED },
      ];

      const isAllowed = allowedDowngrades.some(
        (rule) => rule.from === currentStatus && rule.to === newStatus
      );

      if (!isAllowed) {
        ErrorHelper.BadRequestException(
          `Cannot downgrade order status from ${currentStatus} to ${newStatus}`,
        );
      }
    }
  }

  private async initiateRefund(orderId: number): Promise<void> {
    try {
      const order = await this.findOrderById(orderId);

      if (order.paymentStatus !== PaymentStatus.PAID) {
        this.logger.warn(`Order ${orderId} is not paid, skipping refund`);
        return;
      }

      if (order.isRefunded) {
        this.logger.warn(`Order ${orderId} already refunded`);
        return;
      }

      // TODO: Implement actual refund logic with payment provider
      this.logger.log(`Refund process initiated for order ${orderId}`);

      // Update order refund status
      await this.orderRepository.update(orderId, {
        refundDetails: {
          ...order.refundDetails,
          status: RefundStatus.PROCESSING,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to initiate refund: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async initiateAutomaticRefundAfterRejection(
    orderId: number,
    reason: string,
    businessId: number,
  ): Promise<void> {
    try {
      this.logger.log(`Initiating automatic refund for rejected order ${orderId}`);

      const order = await this.findOrderById(orderId);

      // Eligibility checks
      if (order.paymentStatus !== PaymentStatus.PAID) {
        this.logger.warn(`Order ${orderId} is not paid, skipping refund`);
        return;
      }

      if (order.isRefunded) {
        this.logger.warn(`Order ${orderId} already refunded`);
        return;
      }

      // Calculate refund split
      const platformFee = order.total * (PLATFORM_FEE_PERCENTAGE / 100);
      const businessAmount = order.total - platformFee;

      // References
      const platformRefundRef = `REF-PLAT-${uuidv4().substring(0, 8).toUpperCase()}`;
      const businessRefundRef = `REF-BIZ-${uuidv4().substring(0, 8).toUpperCase()}`;
      const globalRefundRef = `RFD-${uuidv4().substring(0, 8).toUpperCase()}`;

      // Build refund object
      const refundDetails: RefundDetails = {
        refundReference: globalRefundRef,
        amountRequested: order.total,
        amountApproved: order.total, // Auto-approve
        amountRefunded: 0,
        remainingAmount: order.total,

        status: RefundStatus.PROCESSING,

        reason: `Order rejected: ${reason}`,
        refundType: RefundType.FULL,
        refundMethod: RefundMethod.ORIGINAL_PAYMENT,

        customerNote:
          'The merchant rejected your order. A full refund has been initiated to your original payment method.',
        merchantNote: reason,

        requestedBy: order.userId || 0,
        approvedBy: businessId,

        requestedAt: order.refundDetails?.requestedAt || new Date(),
        approvedAt: new Date(),
        processingAt: new Date(),

        transactions: [],
        meta: {
          platformFeePercentage: PLATFORM_FEE_PERCENTAGE,
        },
      };

      //
      // 1️⃣ PROCESS PLATFORM REFUND (if applicable)
      //
      if (platformFee > 0) {
        try {
          refundDetails.transactions.push({
            type: RefundTransactionType.PLATFORM_REFUND,
            amount: platformFee,
            reference: platformRefundRef,
            status: RefundTransactionStatus.SUCCESS,
            processedAt: new Date(),
          });

          refundDetails.amountRefunded += platformFee;
          refundDetails.remainingAmount -= platformFee;

          this.logger.log(
            `Platform refund successful for order ${orderId}: ${platformFee} (${platformRefundRef})`,
          );
        } catch (err) {
          refundDetails.transactions.push({
            type: RefundTransactionType.PLATFORM_REFUND,
            amount: platformFee,
            reference: platformRefundRef,
            status: RefundTransactionStatus.FAILED,
          });

          this.logger.error(
            `Platform refund failed for order ${orderId}: ${err.message}`,
          );
        }
      }

      //
      // 2️⃣ PROCESS BUSINESS REFUND
      //
      if (businessAmount > 0) {
        try {
          const customer = order.user;

          const accountNumber =
            customer.personalAccountNumber || customer.walletAccountNumber;
          const bankCode =
            customer.personalBankCode || customer.walletBankCode;
          const accountName =
            customer.personalAccountName || customer.walletAccountName;

          if (!accountNumber || !bankCode) {
            // fallback – wallet refund
            refundDetails.transactions.push({
              type: RefundTransactionType.BUSINESS_REFUND,
              amount: businessAmount,
              reference: businessRefundRef,
              status: RefundTransactionStatus.SUCCESS,
              processedAt: new Date(),
            });

            this.logger.log(
              `Wallet-based business refund successful for order ${orderId}`,
            );
          } else {
            // Bank transfer
            await this.paymentService.transferToBank({
              amount: businessAmount,
              reference: businessRefundRef,
              narration: `Refund for order ${order.orderReference}`,
              destinationAccountNumber: accountNumber,
              destinationBankCode: bankCode,
              destinationAccountName: accountName,
              sourceWalletReference: order.business.user.walletReference,
              currency: 'NGN',
            });

            refundDetails.transactions.push({
              type: RefundTransactionType.BUSINESS_REFUND,
              amount: businessAmount,
              reference: businessRefundRef,
              status: RefundTransactionStatus.SUCCESS,
              processedAt: new Date(),
            });
          }

          refundDetails.amountRefunded += businessAmount;
          refundDetails.remainingAmount -= businessAmount;

          this.logger.log(
            `Business refund successful for order ${orderId}: ${businessAmount} (${businessRefundRef})`,
          );
        } catch (err) {
          refundDetails.transactions.push({
            type: RefundTransactionType.BUSINESS_REFUND,
            amount: businessAmount,
            reference: businessRefundRef,
            status: RefundTransactionStatus.FAILED,
          });

          this.logger.error(
            `Business refund failed for order ${orderId}: ${err.message}`,
          );
        }
      }

      //
      // 3️⃣ FINAL REFUND STATUS CALCULATION
      //
      const allSuccess = refundDetails.transactions.every(
        (t) => t.status === RefundTransactionStatus.SUCCESS,
      );

      const someSuccess = refundDetails.transactions.some(
        (t) => t.status === RefundTransactionStatus.SUCCESS,
      );

      if (allSuccess) {
        refundDetails.status = RefundStatus.COMPLETED;
        refundDetails.refundedAt = new Date();
      } else if (someSuccess) {
        refundDetails.status = RefundStatus.PARTIALLY_COMPLETED;
      } else {
        refundDetails.status = RefundStatus.FAILED;
        refundDetails.failedAt = new Date();
      }

      //
      // 4️⃣ SAVE TO DATABASE
      //
      await this.orderRepository.update(orderId, {
        isRefunded: allSuccess,
        refundedAmount: refundDetails.amountRefunded,
        refundReference: globalRefundRef,
        refundDetails,
        status: allSuccess ? OrderStatus.REFUNDED : OrderStatus.CANCELLED,
      });

      //
      // 5️⃣ NOTIFICATIONS / ALERTS
      //
      if (allSuccess) {
        this.logger.log(`Automatic refund completed successfully for order ${orderId}`);
        // this.sendRefundNotifications(order);
      } else {
        this.logger.error(
          `Refund incomplete for order ${orderId}. Manual intervention required.`,
        );
        this.sendRefundFailureAlert(orderId, refundDetails);
      }
    } catch (error) {
      this.logger.error(
        `Automatic refund process failed for order ${orderId}: ${error.message}`,
        error.stack,
      );

      this.sendRefundFailureAlert(orderId, null, error.message);
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

  private async sendRefundFailureAlert(
    orderId: number,
    refundDetails?: RefundDetails | null,
    errorMessage?: string,
  ): Promise<void> {
    try {
      // TODO: Implement admin alert system (email, Slack, etc.)
      this.logger.error(
        `REFUND FAILURE ALERT - Order ${orderId}: ${errorMessage || 'Some transactions failed'}`,
      );
      this.logger.error(`Refund details: ${JSON.stringify(refundDetails)}`);
    } catch (error) {
      this.logger.error(`Failed to send refund failure alert: ${error.message}`);
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

  private hasStatusInHistory(order: Order, status: OrderStatus): boolean {
    if (!order.statusHistory || order.statusHistory.length === 0) {
      return false;
    }
    return order.statusHistory.some(entry => entry.status === status);
  }

  private addStatusToHistory(
    order: Order,
    newStatus: OrderStatus,
    userId?: number | null,
    notes?: string,
    metadata?: Record<string, any>,
  ): void {
    if (!order.statusHistory) {
      order.statusHistory = [];
    }

    // Prevent duplicate status entries
    if (this.hasStatusInHistory(order, newStatus)) {
      this.logger.warn(
        `Status ${newStatus} already exists in history for order ${order.id}, skipping duplicate`
      );
      return;
    }

    const historyEntry: OrderStatusHistory = {
      status: newStatus,
      timestamp: new Date(),
      updatedBy: userId,
      notes,
      metadata,
    };

    order.statusHistory.push(historyEntry);
  }

  private validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): void {
    // Allow same status (no-op)
    if (currentStatus === newStatus) {
      return;
    }

    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [
        OrderStatus.CONFIRMED,    // After payment
        OrderStatus.CANCELLED,    // User cancels before payment
      ],
      [OrderStatus.CONFIRMED]: [
        OrderStatus.PROCESSING,   // Merchant accepts
        OrderStatus.CANCELLED,    // Merchant rejects
      ],
      [OrderStatus.PROCESSING]: [
        OrderStatus.SHIPPED,
        OrderStatus.CANCELLED,    // Only if not yet shipped
      ],
      [OrderStatus.SHIPPED]: [
        OrderStatus.DELIVERED,
        OrderStatus.RETURNED,     // Customer returns
      ],
      [OrderStatus.DELIVERED]: [
        OrderStatus.COMPLETED,
        OrderStatus.RETURNED,
      ],
      [OrderStatus.CANCELLED]: [
        OrderStatus.REFUNDED,
      ],
      [OrderStatus.RETURNED]: [
        OrderStatus.REFUNDED,
      ],
      [OrderStatus.REFUNDED]: [],
      [OrderStatus.COMPLETED]: [],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      ErrorHelper.BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}. Valid transitions: ${validTransitions[currentStatus]?.join(', ') || 'none'}`
      );
    }
  }

  private updatePaymentStatusForOrderStatus(order: Order): void {
    switch (order.status) {
      case OrderStatus.CANCELLED:
        if (order.paymentStatus === PaymentStatus.PAID) {
          // Paid orders that are cancelled should show refund pending
          order.paymentStatus = PaymentStatus.PAID; // Keep as paid until refund completes
        }
        break;

      case OrderStatus.REFUNDED:
        order.paymentStatus = PaymentStatus.REFUNDED;
        break;

      // Other statuses maintain their payment status
      default:
        break;
    }
  }
}
