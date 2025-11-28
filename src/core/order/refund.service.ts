// src/core/order/refund.service.ts

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Business } from '../businesses/business.entity';
import { PaystackProvider } from '../payment/providers/paystack.provider';
import {
  Transaction,
  TransactionFlow,
  TransactionStatus,
  TransactionType,
} from '../transaction/entity/transaction.entity';
import { User } from '../users/entity/user.entity';
import { CreateRefundDto, RefundType } from './dto/refund.dto';
import { Order } from './entity/order.entity';
import { OrderStatus, PaymentStatus } from './interfaces/order.interface';

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    private readonly paystackProvider: PaystackProvider,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Process a refund for an order
   */
  async processRefund(createRefundDto: CreateRefundDto, refundedByUserId: number): Promise<any> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { orderId, refundType, amount, reason, refundMethod, customerNote, merchantNote } =
        createRefundDto;

      // 1. Fetch and validate order
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
        relations: ['business', 'business.user', 'user', 'items'],
      });

      if (!order) {
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      }

      // Validate order can be refunded
      this.validateRefundEligibility(order, refundType, amount);

      // 2. Calculate refund amounts
      const refundCalculation = this.calculateRefundAmounts(order, refundType, amount);

      // 3. Generate refund reference
      const refundReference = `RFD-${uuidv4().substring(0, 8).toUpperCase()}`;

      this.logger.log(
        `Processing ${refundType} refund for order ${order.id}: ₦${refundCalculation.totalRefund}`,
      );

      // 4. Process refund on Paystack (refund to customer)
      const paystackRefund = await this.paystackProvider.createRefund({
        transactionReference: order.transactionReference,
        amount: refundCalculation.totalRefund,
        merchantNote: merchantNote || `Refund for order ${order.orderReference}`,
        customerNote: customerNote || reason,
      });

      this.logger.log(`Paystack refund successful: ${paystackRefund.refundReference}`);

      // 5. Deduct from business wallet (they need to return their portion)
      await this.deductFromBusinessWallet(
        order.business.userId,
        order.businessId,
        order.id,
        refundCalculation.businessRefund,
        refundReference,
        queryRunner,
      );

      // 6. Record all transactions
      const refundTransactions: Array<{
        type: string;
        amount: number;
        reference: string;
        status: string;
      }> = [];

      // Customer refund transaction (platform perspective)
      const customerRefundTxn = await queryRunner.manager.save(Transaction, {
        userId: null, // Platform transaction
        businessId: null,
        orderId: order.id,
        type: TransactionType.REFUND,
        flow: TransactionFlow.DEBIT,
        amount: refundCalculation.platformRefund,
        fee: 0,
        netAmount: refundCalculation.platformRefund,
        status: TransactionStatus.SUCCESS,
        reference: `${refundReference}-PLATFORM`,
        providerReference: paystackRefund.refundReference,
        description: `Platform refund for order ${order.orderReference}`,
        paymentProvider: 'PAYSTACK',
        metadata: {
          orderId: order.id,
          refundType,
          reason,
        },
        settledAt: new Date(),
      });

      refundTransactions.push({
        type: 'PLATFORM_REFUND',
        amount: refundCalculation.platformRefund,
        reference: customerRefundTxn.reference,
        status: 'SUCCESS',
      });

      // Business refund transaction (deduction from their wallet)
      const businessRefundTxn = await queryRunner.manager.save(Transaction, {
        userId: order.business.userId,
        businessId: order.businessId,
        orderId: order.id,
        type: TransactionType.REFUND,
        flow: TransactionFlow.DEBIT,
        amount: refundCalculation.businessRefund,
        fee: 0,
        netAmount: refundCalculation.businessRefund,
        status: TransactionStatus.SUCCESS,
        reference: `${refundReference}-BUSINESS`,
        providerReference: paystackRefund.refundReference,
        description: `Business refund for order ${order.orderReference}`,
        paymentProvider: 'PAYSTACK',
        metadata: {
          orderId: order.id,
          refundType,
          reason,
        },
        settledAt: new Date(),
      });

      refundTransactions.push({
        type: 'BUSINESS_REFUND',
        amount: refundCalculation.businessRefund,
        reference: businessRefundTxn.reference,
        status: 'SUCCESS',
      });

      // 7. Update order with refund details
      const refundDetails: any = {
        amount: refundCalculation.totalRefund,
        reason,
        refundType,
        refundMethod,
        customerNote,
        merchantNote,
        refundedBy: refundedByUserId,
        refundedAt: new Date(),
        transactions: refundTransactions,
        breakdown: {
          totalRefund: refundCalculation.totalRefund,
          platformRefund: refundCalculation.platformRefund,
          businessRefund: refundCalculation.businessRefund,
        },
      };

      await queryRunner.manager.update(Order, order.id, {
        isRefunded: refundType === RefundType.FULL,
        refundedAmount: (order.refundedAmount || 0) + refundCalculation.totalRefund,
        refundReference,
        refundDate: new Date(),
        refundDetails,
        status: refundType === RefundType.FULL ? OrderStatus.REFUNDED : order.status,
        paymentStatus:
          refundType === RefundType.FULL ? PaymentStatus.REFUNDED : order.paymentStatus,
      });

      // 8. Return inventory if full refund
      if (refundType === RefundType.FULL) {
        await this.returnInventory(order, queryRunner);
      }

      await queryRunner.commitTransaction();

      this.logger.log(`Refund completed successfully for order ${order.id}`);

      return {
        success: true,
        message: 'Refund processed successfully',
        data: {
          orderId: order.id,
          orderReference: order.orderReference,
          refundReference,
          refundAmount: refundCalculation.totalRefund,
          refundType,
          status: 'SUCCESS',
          transactions: refundTransactions,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Refund failed: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Validate if order is eligible for refund
   */
  private validateRefundEligibility(order: Order, refundType: RefundType, amount?: number): void {
    // Check if order is paid
    if (order.paymentStatus !== 'PAID') {
      throw new BadRequestException('Only paid orders can be refunded');
    }

    // Check if already fully refunded
    if (order.isRefunded) {
      throw new BadRequestException('Order has already been fully refunded');
    }

    // Check if refund amount exceeds available amount
    const availableForRefund = order.total - (order.refundedAmount || 0);

    if (refundType === RefundType.PARTIAL) {
      if (!amount || amount <= 0) {
        throw new BadRequestException('Partial refund requires a valid amount');
      }

      if (amount > availableForRefund) {
        throw new BadRequestException(
          `Refund amount (₦${amount}) exceeds available refund amount (₦${availableForRefund})`,
        );
      }
    }

    // Optional: Check refund time window (e.g., within 30 days)
    const daysSincePurchase = Math.floor(
      (Date.now() - new Date(order.paymentDate).getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSincePurchase > 30) {
      this.logger.warn(`Refund requested ${daysSincePurchase} days after purchase`);
      // You can decide to throw error or just log warning
      // throw new BadRequestException('Refund window has expired (30 days)');
    }
  }

  /**
   * Calculate refund amounts (split between platform and business)
   */
  private calculateRefundAmounts(
    order: Order,
    refundType: RefundType,
    amount?: number,
  ): {
    totalRefund: number;
    platformRefund: number;
    businessRefund: number;
  } {
    const totalRefund = refundType === RefundType.FULL ? order.total : amount || 0;

    // Calculate based on original split (e.g., 5% platform, 95% business)
    const platformFeePercentage = 0.05; // 5%
    const platformRefund = totalRefund * platformFeePercentage;
    const businessRefund = totalRefund * (1 - platformFeePercentage);

    return {
      totalRefund,
      platformRefund,
      businessRefund,
    };
  }

  /**
   * Deduct refund amount from business wallet
   */
  private async deductFromBusinessWallet(
    userId: number,
    businessId: number,
    orderId: number,
    amount: number,
    refundReference: string,
    queryRunner: any,
  ): Promise<void> {
    try {
      // Get current balance
      const balance = await this.getBusinessBalance(userId);

      if (balance < amount) {
        throw new BadRequestException(
          `Insufficient wallet balance for refund. Required: ₦${amount}, Available: ₦${balance}`,
        );
      }

      // Record deduction transaction
      await queryRunner.manager.save(Transaction, {
        userId,
        businessId,
        orderId,
        type: TransactionType.REFUND,
        flow: TransactionFlow.DEBIT,
        amount,
        fee: 0,
        netAmount: amount,
        status: TransactionStatus.SUCCESS,
        reference: `${refundReference}-DEDUCT`,
        description: `Wallet deduction for refund ${refundReference}`,
        paymentProvider: 'PAYSTACK',
        metadata: {
          refundReference,
        },
        settledAt: new Date(),
      });

      this.logger.log(`Deducted ₦${amount} from business ${businessId} wallet`);
    } catch (error) {
      this.logger.error('Failed to deduct from business wallet:', error);
      throw error;
    }
  }

  /**
   * Get business wallet balance
   */
  private async getBusinessBalance(userId: number): Promise<number> {
    const result = await this.transactionRepository
      .createQueryBuilder('txn')
      .select('SUM(CASE WHEN txn.flow = :credit THEN txn.netAmount ELSE 0 END)', 'credits')
      .addSelect('SUM(CASE WHEN txn.flow = :debit THEN txn.netAmount ELSE 0 END)', 'debits')
      .where('txn.userId = :userId', { userId })
      .andWhere('txn.status = :status', { status: TransactionStatus.SUCCESS })
      .setParameter('credit', TransactionFlow.CREDIT)
      .setParameter('debit', TransactionFlow.DEBIT)
      .getRawOne();

    const credits = parseFloat(result.credits || '0');
    const debits = parseFloat(result.debits || '0');
    return credits - debits;
  }

  /**
   * Return inventory to stock for refunded items
   */
  private async returnInventory(order: Order, queryRunner: any): Promise<void> {
    try {
      for (const item of order.items) {
        await queryRunner.manager.increment(
          'products',
          { id: item.productId },
          'quantityInStock',
          item.quantity,
        );

        this.logger.log(`Returned ${item.quantity} units of product ${item.productId} to stock`);
      }
    } catch (error) {
      this.logger.error('Failed to return inventory:', error);
      // Don't throw - this is not critical for refund
    }
  }

  /**
   * Get refund history for an order
   */
  async getOrderRefunds(orderId: number): Promise<any> {
    try {
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
        select: ['id', 'orderReference', 'total', 'refundedAmount', 'refundDetails', 'isRefunded'],
      });

      if (!order) {
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      }

      const refundTransactions = await this.transactionRepository.find({
        where: {
          orderId,
          type: TransactionType.REFUND,
        },
        order: { createdAt: 'DESC' },
      });

      return {
        order: {
          id: order.id,
          reference: order.orderReference,
          total: order.total,
          refundedAmount: order.refundedAmount || 0,
          availableForRefund: order.total - (order.refundedAmount || 0),
          isFullyRefunded: order.isRefunded,
        },
        refunds: order.refundDetails ? [order.refundDetails] : [],
        transactions: refundTransactions,
      };
    } catch (error) {
      this.logger.error('Failed to get refund history:', error);
      throw error;
    }
  }
}
