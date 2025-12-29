// src/core/payment/providers/paystack-webhook.handler.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../order/entity/order.entity';
import { OrderStatus } from '../../../common/enums/order.enum';
import { PaymentStatus } from '../../../common/enums/payment.enum';
import {
  Transaction,
  TransactionFlow,
  TransactionStatus,
  TransactionType,
} from '../../transaction/entity/transaction.entity';
import { User } from '../../users/entity/user.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { WalletStatus } from '../../../common/enums/payment.enum';
import { PaystackIntegrationService } from '../paystack-integration.service';
import { NotificationService } from '../../notifications/notification.service';
import { AuditService } from '../../audit/audit.service';


@Injectable()
export class PaystackWebhookHandler {
  private readonly logger = new Logger(PaystackWebhookHandler.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly paystackIntegrationService: PaystackIntegrationService,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
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

      // Find wallet by customer code (provider customer ID)
      const wallet = await this.walletRepository.findOne({
        where: { providerCustomerId: customerCode },
      });

      if (!wallet) {
        this.logger.warn(`Wallet not found for customer code: ${customerCode}`);
        return;
      }

      // Update wallet with DVA details
      await this.walletRepository.update(wallet.id, {
        accountNumber: accountNumber,
        accountName: accountName,
        bankName: bankName,
        bankCode: bankCode,
        providerAccountId: accountId.toString(),
        status: WalletStatus.ACTIVE,
        activatedAt: new Date(),
      });

      this.logger.log(`[DVA UPDATED] Wallet ${wallet.id} account activated`);
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

      // Find wallet by customer code
      const wallet = await this.walletRepository.findOne({
        where: { providerCustomerId: customerCode },
        relations: ['user', 'user.business'],
      });

      if (!wallet) {
        this.logger.warn(`Wallet not found for customer code: ${customerCode}`);
        return;
      }

      // Record transaction - wallet funding
      await this.paystackIntegrationService.recordTransaction({
        userId: wallet.userId,
        businessId: wallet.user?.businessId,
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

      this.logger.log(`[DVA PAYMENT RECORDED] Wallet ${wallet.id} credited with ₦${amount}`);

      // Audit Log
      await this.auditService.log({
        action: 'WALLET_FUNDED',
        entityId: wallet.id,
        entityType: 'WALLET',
        performedBy: wallet.userId,
        metadata: {
          businessId: wallet.user?.businessId,
          details: {
            amount: amount,
            reference: reference,
            channel: 'DVA_TRANSFER'
          },
          ...data
        },
      });

      // Send notification
      if (wallet.user?.email) {
        await this.notificationService.sendWalletFundedNotification(wallet.user.email, amount, reference);
      }
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

      // Audit Log
      await this.auditService.log({
        action: 'PAYMENT_SUCCESSFUL',
        entityId: orderId,
        entityType: 'ORDER',
        performedBy: order.userId || undefined,
        metadata: {
          businessId: order.businessId,
          details: {
            amount: order.total,
            reference: reference,
            provider: 'PAYSTACK'
          },
          ...data
        },
      });
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
        relations: ['user'],
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

      // Audit Log
      await this.auditService.log({
        action: 'TRANSFER_SUCCESSFUL',
        entityId: transaction.id,
        entityType: 'TRANSACTION',
        performedBy: transaction.userId || undefined,
        metadata: {
          businessId: transaction.businessId,
          details: {
            amount: transferAmount,
            reference: reference,
          },
          ...data
        },
      });

      if (transaction.user?.email) {
        await this.notificationService.sendPayoutSuccessNotification(
          transaction.user.email,
          transferAmount,
          reference,
        );
      }
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
        relations: ['user'],
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

      if (transaction.user?.email) {
        await this.notificationService.sendPayoutFailedNotification(
          transaction.user.email,
          transferAmount,
          reference,
          data.reason // Paystack often sends reason
        );
      }

      await this.alertAdmin(
        `Transfer Failed for Transaction ${reference}`,
        `Reason: ${data.reason}\nReference: ${reference}\nProvider Response: ${JSON.stringify(data)}`
      );
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

      // Audit Log
      await this.auditService.log({
        action: 'REFUND_PROCESSED',
        entityId: refundTransaction.id,
        entityType: 'TRANSACTION',
        performedBy: refundTransaction.userId || undefined,
        metadata: {
          businessId: refundTransaction.businessId,
          details: {
            amount: data.transaction.amount / 100,
            reference: reference,
          },
          ...data
        },
      });
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

      await this.alertAdmin(
        `Refund Failed for Transaction ${reference}`,
        `Reason: ${data.status}\nReference: ${reference}\nProvider Response: ${JSON.stringify(data)}`
      );
    } catch (error) {
      this.logger.error('[REFUND FAILED ERROR]', error);
    }
  }

  /**
   * Alert Admin about critical failures
   */
  private async alertAdmin(subject: string, message: string): Promise<void> {
    try {
      const adminEmail = this.configService.get<string>('ADMIN_EMAIL') || 'admin@qkly.com';
      await this.notificationService.sendEmail(
        adminEmail,
        `[CRITICAL] ${subject}`,
        `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2 style="color: red;">System Alert</h2>
          <p><strong>Subject:</strong> ${subject}</p>
          <pre style="background: #f4f4f4; padding: 10px; overflow-x: auto;">${message}</pre>
          <p>Please check the system logs for more details.</p>
        </div>
        `
      );
    } catch (error) {
      this.logger.error('Failed to send admin alert', error);
    }
  }
}