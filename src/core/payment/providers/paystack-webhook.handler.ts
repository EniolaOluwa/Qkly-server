// src/core/payment/providers/paystack-webhook.handler.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../order/entity/order.entity';
import { OrderStatus } from '../../order/interfaces/order.interface';
import { TransactionFlow, TransactionStatus, TransactionType } from '../../transaction/types/transaction.types';
import { User } from '../../users/entity/user.entity';
import { PaystackIntegrationService } from '../paystack-integration.service';
import { PaymentStatus } from '../types/payment.status';
import { Transaction } from '../../transaction/entity/transaction.entity';


@Injectable()
export class PaystackWebhookHandler {
  private readonly logger = new Logger(PaystackWebhookHandler.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly paystackIntegrationService: PaystackIntegrationService,
  ) { }

  async handleWebhook(event: string, data: any): Promise<void> {
    this.logger.log(`[WEBHOOK] ${event}`);

    switch (event) {
      case 'charge.success':
        await this.handlePaymentSuccess(data);
        break;

      case 'dedicatedaccount.assign.success':
        await this.handleDVAAssignment(data);
        break;

      case 'dedicatedaccount.assign':
        await this.handleDVAPayment(data);
        break;

      case 'transfer.success':
        await this.handleTransferSuccess(data);
        break;

      case 'transfer.failed':
        await this.handleTransferFailed(data);
        break;

      case 'refund.processed':
        await this.handleRefundProcessed(data);
        break;

      case 'refund.failed':
        await this.handleRefundFailed(data);
        break;

      default:
        this.logger.log(`Unhandled event: ${event}`);
    }
  }

  /**
   * Handle DVA assignment (when account number is assigned to customer)
   */
  private async handleDVAAssignment(data: any): Promise<void> {
    try {
      const customerCode = data.customer.customer_code;
      const accountNumber = data.dedicated_account.account_number;
      const accountName = data.dedicated_account.account_name;
      const bankName = data.dedicated_account.bank.name;
      const bankCode = data.dedicated_account.bank.code || data.dedicated_account.bank.id;
      const accountId = data.dedicated_account.id;

      this.logger.log(`[DVA ASSIGNED] Customer: ${customerCode}, Account: ${accountNumber}`);

      // Find user by customer code
      const user = await this.userRepository.findOne({
        where: { paystackCustomerCode: customerCode },
      });

      if (!user) {
        this.logger.warn(`User not found for customer code: ${customerCode}`);
        return;
      }

      // Update user with DVA details
      await this.userRepository.update(user.id, {
        walletAccountNumber: accountNumber,
        walletAccountName: accountName,
        walletBankName: bankName,
        walletBankCode: bankCode,
        paystackDedicatedAccountId: accountId.toString(),
        paystackAccountStatus: 'ACTIVE',
        updatedAt: new Date(),
      });

      this.logger.log(`[DVA UPDATED] User ${user.id} account activated`);
    } catch (error) {
      this.logger.error('[DVA ASSIGNMENT ERROR]', error);
      throw error;
    }
  }

  /**
   * Handle payment received into DVA (customer funded their wallet)
   */
  private async handleDVAPayment(data: any): Promise<void> {
    try {
      const amount = data.amount / 100; // Convert from kobo to naira
      const reference = data.reference;
      const customerCode = data.customer.customer_code;
      const accountNumber = data.dedicated_account_assignment.account_number;

      this.logger.log(
        `[DVA PAYMENT] ₦${amount} received in account ${accountNumber} for customer ${customerCode}`,
      );

      // Find user by customer code
      const user = await this.userRepository.findOne({
        where: { paystackCustomerCode: customerCode },
        relations: ['business'],
      });

      if (!user) {
        this.logger.warn(`User not found for customer code: ${customerCode}`);
        return;
      }

      // Record transaction - wallet funding
      await this.paystackIntegrationService.recordTransaction({
        userId: user.id,
        businessId: user.business?.id,
        type: TransactionType.WALLET_FUNDING,
        flow: TransactionFlow.CREDIT,
        amount: amount,
        fee: 0,
        status: TransactionStatus.SUCCESS,
        reference: reference,
        providerReference: reference,
        description: `Wallet funding via bank transfer to ${accountNumber}`,
        metadata: {
          accountNumber,
          customerCode,
          source: 'dva_payment',
        },
        providerResponse: data,
      });

      this.logger.log(`[DVA PAYMENT RECORDED] User ${user.id} wallet credited with ₦${amount}`);
    } catch (error) {
      this.logger.error('[DVA PAYMENT ERROR]', error);
    }
  }

  /**
   * Handle successful payment from charge (order payment)
   */
  private async handlePaymentSuccess(data: any): Promise<void> {
    try {
      const { reference, amount, metadata, customer } = data;
      const orderId = metadata?.orderId;

      if (!orderId) {
        this.logger.warn('No orderId in payment metadata');
        return;
      }

      const order = await this.orderRepository.findOne({
        where: { id: orderId },
        relations: ['business', 'user'],
      });

      if (!order) {
        this.logger.error(`Order ${orderId} not found`);
        return;
      }

      // Check if already processed
      if (order.paymentStatus === PaymentStatus.PAID) {
        this.logger.log(`Order ${orderId} already processed`);
        return;
      }

      // Update order
      order.paymentStatus = PaymentStatus.PAID;
      order.status = OrderStatus.PROCESSING;
      order.paymentDate = new Date();
      await this.orderRepository.save(order);

      // Record transaction for business (they received settlement via subaccount)
      const platformFee = order.total * 0.05;
      const businessAmount = order.total - platformFee;

      await this.paystackIntegrationService.recordTransaction({
        userId: order.business.userId,
        businessId: order.businessId,
        orderId: order.id,
        type: TransactionType.SETTLEMENT,
        flow: TransactionFlow.CREDIT,
        amount: order.total,
        fee: platformFee,
        status: TransactionStatus.SUCCESS,
        reference: `SET-${order.transactionReference}`,
        providerReference: reference,
        description: `Settlement for order ${order.orderReference}`,
        metadata: {
          orderId: order.id,
          split: 'auto',
          platformFee,
          businessAmount,
        },
        providerResponse: data,
      });

      this.logger.log(
        `[PAYMENT SUCCESS] Order ${orderId} paid, business ${order.businessId} credited ₦${businessAmount}`,
      );
    } catch (error) {
      this.logger.error('[PAYMENT SUCCESS ERROR]', error);
    }
  }

  /**
   * Handle successful transfer
   */
  private async handleTransferSuccess(data: any): Promise<void> {
    try {
      const { reference, amount, recipient, status, transfer_code } = data;
      const transferAmount = amount / 100; // Convert from kobo

      this.logger.log(`[TRANSFER SUCCESS] ₦${transferAmount} - Reference: ${reference}`);

      // Find the transaction by reference
      const transaction = await this.transactionRepository.findOne({
        where: { reference },
      });

      if (!transaction) {
        this.logger.warn(`Transaction not found for reference: ${reference}`);
        return;
      }

      // Update transaction status
      await this.transactionRepository.update(transaction.id, {
        status: TransactionStatus.SUCCESS,
        settledAt: new Date(),
        providerResponse: data,
      });

      this.logger.log(`[TRANSFER SUCCESS] Transaction ${transaction.id} marked as successful`);
    } catch (error) {
      this.logger.error('[TRANSFER SUCCESS ERROR]', error);
    }
  }

  /**
   * Handle failed transfer
   */
  private async handleTransferFailed(data: any): Promise<void> {
    try {
      const { reference, amount, status } = data;
      const transferAmount = amount / 100;

      this.logger.error(`[TRANSFER FAILED] ₦${transferAmount} - Reference: ${reference}`);

      // Find the transaction by reference
      const transaction = await this.transactionRepository.findOne({
        where: { reference },
      });

      if (!transaction) {
        this.logger.warn(`Transaction not found for reference: ${reference}`);
        return;
      }

      // Update transaction status
      await this.transactionRepository.update(transaction.id, {
        status: TransactionStatus.FAILED,
        providerResponse: data,
      });

      this.logger.log(`[TRANSFER FAILED] Transaction ${transaction.id} marked as failed`);

      // TODO: Implement retry logic or notification to admin
    } catch (error) {
      this.logger.error('[TRANSFER FAILED ERROR]', error);
    }
  }

  /**
   * Handle successful refund processing
   */
  private async handleRefundProcessed(data: any): Promise<void> {
    try {
      const { transaction, status } = data;
      const reference = transaction.reference;

      this.logger.log(`[REFUND PROCESSED] ${reference}`);

      // Find the refund transaction
      const refundTransaction = await this.transactionRepository.findOne({
        where: { providerReference: reference },
      });

      if (!refundTransaction) {
        this.logger.warn(`Refund transaction not found: ${reference}`);
        return;
      }

      // Update transaction status
      await this.transactionRepository.update(refundTransaction.id, {
        status: TransactionStatus.SUCCESS,
        settledAt: new Date(),
        providerResponse: data,
      });

      this.logger.log(`[REFUND PROCESSED] Transaction ${refundTransaction.id} completed`);
    } catch (error) {
      this.logger.error('[REFUND PROCESSED ERROR]', error);
    }
  }

  /**
   * Handle failed refund
   */
  private async handleRefundFailed(data: any): Promise<void> {
    try {
      const { transaction, status } = data;
      const reference = transaction.reference;

      this.logger.error(`[REFUND FAILED] ${reference}`);

      // Find the refund transaction
      const refundTransaction = await this.transactionRepository.findOne({
        where: { providerReference: reference },
      });

      if (!refundTransaction) {
        this.logger.warn(`Refund transaction not found: ${reference}`);
        return;
      }

      // Update transaction status
      await this.transactionRepository.update(refundTransaction.id, {
        status: TransactionStatus.FAILED,
        providerResponse: data,
      });

      this.logger.log(`[REFUND FAILED] Transaction ${refundTransaction.id} marked as failed`);

      // TODO: Alert admin or retry
    } catch (error) {
      this.logger.error('[REFUND FAILED ERROR]', error);
    }
  }
}