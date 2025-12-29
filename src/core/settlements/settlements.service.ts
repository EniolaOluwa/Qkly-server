import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PaymentService } from '../payment/payment.service';
import { BankAccountsService } from '../bank-accounts/bank-accounts.service'; // Fixed Import Path (check if correct)
import { User } from '../users/entity/user.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { WalletsService } from '../wallets/wallets.service'; // Import WalletsService
import { Transaction, TransactionType, TransactionFlow, TransactionStatus } from '../transaction/entity/transaction.entity';
import { Settlement } from './entities/settlement.entity';
import { SettlementStatus } from '../../common/enums/settlement.enum'; // Import Status
import { Order } from '../order/entity/order.entity'; // Import Order
import { RequestPayoutDto } from './dto/request-payout.dto';
import { v4 as uuidv4 } from 'uuid';
import { TransferStatus } from '../payment/dto/payment-provider.dto';

@Injectable()
export class SettlementsService {
  private readonly logger = new Logger(SettlementsService.name);

  constructor(
    @InjectRepository(Settlement)
    private readonly settlementRepository: Repository<Settlement>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @Inject(forwardRef(() => PaymentService))
    private readonly paymentService: PaymentService,
    private readonly bankAccountsService: BankAccountsService,
    private readonly walletsService: WalletsService,
    private readonly dataSource: DataSource,
  ) { }

  /**
   * Process instant settlement for a paid order
   * Credits the merchant's wallet with the net amount
   */
  async processInstantSettlement(order: Order): Promise<Settlement> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Idempotency Check
      const existingSettlement = await this.settlementRepository.findOne({
        where: { orderId: order.id },
      });

      if (existingSettlement) {
        this.logger.warn(`Settlement already exists for order ${order.id}`);
        return existingSettlement;
      }

      // 2. Identify Merchant User
      // Order.business.userId should be available. If order.business is not loaded, we load it.
      let businessUserId = order.business?.userId;
      if (!businessUserId) {
        const business = await queryRunner.manager.findOne(this.dataSource.getRepository('Business').target, {
          where: { id: order.businessId },
          relations: ['user'] // Ensure user is loaded if needed, but we just need userId which is a column
        }) as any;
        businessUserId = business.userId;
      }

      if (!businessUserId) {
        throw new InternalServerErrorException(`Could not find business owner for order ${order.id}`);
      }

      // 3. Calculate Fees
      // Default: 1.5% + NGN 100 (capped at NGN 2000? - Simplification: 1.5% flat for now based on OrderService)
      // Actually standard Paystack is 1.5%, capped at 2000.
      // Let's use a configurable logic later, for now hardcode 1.5%
      const FEE_PERCENTAGE = 0.015;
      const MAX_FEE = 2000;

      let platformFee = order.total * FEE_PERCENTAGE;
      if (platformFee > MAX_FEE) {
        platformFee = MAX_FEE;
      }

      const settlementAmount = Number(order.total) - Number(platformFee);

      // 4. Create Settlement Record
      const settlementReference = `STL-${uuidv4()}`;
      const settlement = this.settlementRepository.create({
        settlementReference,
        businessId: order.businessId,
        orderId: order.id,
        status: SettlementStatus.COMPLETED,
        orderAmount: order.total,
        platformFee: platformFee,
        settlementAmount: settlementAmount,
        currency: 'NGN',
        settledAt: new Date(),
        initiatedBy: 0, // System
      });

      await queryRunner.manager.save(Settlement, settlement);

      // 5. Credit Wallet (Using WalletsService logic but within our Transaction)

      // Fetch OrderPayment to check for Split Payment details
      // Since order.payment might not be loaded or might be stale, let's load it or check relationship
      // Assuming order.payment is loaded? The argument order usually comes from OrderService which loads relations?
      // Let's explicitly fetch OrderPayment just to be safe and get providerResponse
      const orderPayment = await queryRunner.manager.findOne(this.dataSource.getRepository('OrderPayment').target, {
        where: { orderId: order.id }
      }) as any;

      let isSplitPayment = false;
      if (orderPayment?.providerResponse) {
        // Check for subaccount in provider response (Paystack structure)
        // Usually data.subaccount or similar. 
        // During initialization we sent 'subaccount'.
        // The Verification Response should contain 'subaccount' object if it was split.
        const response = orderPayment.providerResponse;
        // Paystack: response.data.subaccount or response.subaccount depending on how we stored it.
        // We stored `transaction` object from webhook or verification.
        if (response.subaccount && response.subaccount.id) {
          isSplitPayment = true;
        } else if (response.data && response.data.subaccount && response.data.subaccount.id) {
          isSplitPayment = true;
        }
      }

      if (isSplitPayment) {
        this.logger.log(`Split Payment detected for order ${order.id}. Skipping wallet balance update.`);
      }

      console.log('DEBUG: Calling creditWallet with skipBalanceUpdate:', isSplitPayment); // DEBUG LOG

      await this.walletsService.creditWallet(
        businessUserId,
        settlementAmount,
        settlementReference,
        `Settlement for Order ${order.orderReference}`,
        queryRunner.manager,
        {
          transactionType: TransactionType.SETTLEMENT,
          orderId: order.id,
          settlementId: settlement.id,
          skipBalanceUpdate: isSplitPayment, // Skip balance update if split
          metadata: { isSplit: isSplitPayment }
        }
      );

      await queryRunner.commitTransaction();
      this.logger.log(`Settlement processed for order ${order.id}: ${settlementAmount} credited to user ${businessUserId}`);

      return settlement;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('DEBUG: Settlement Processing Failed:', error); // DEBUG LOG
      this.logger.error(`Failed to process settlement for order ${order.id}`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Reverse a settlement (Debit Merchant Wallet)
   * Used when an order is refunded
   */
  async reverseSettlement(orderId: number, refundAmount: number, reason: string): Promise<boolean> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const settlement = await this.settlementRepository.findOne({
        where: { orderId },
        relations: ['business', 'business.user'], // Need business user to debit logic
      });

      if (!settlement) {
        this.logger.warn(`No settlement found for order ${orderId} to reverse`);
        // If no settlement exists, we don't need to reverse anything. 
        // But verifying if the merchant was credited via other means? 
        // Assuming consistent usage of processInstantSettlement.
        return true;
      }

      // Check if already reversed? 
      // Settlement entity doesn't have 'REVERSED' status explicitly in my enum view, but we can check if there's a debit transaction?
      // Or we just proceed. Debit is idempotent-ish if we use unique reference?
      // We'll generate a unique reference for this refund.
      const reversalReference = `REV-${orderId}-${Date.now()}`;

      // Calculate amount to debit.
      // Usually we debit the full settlementAmount if full refund.
      // Or partial.
      // If refundAmount is passed, we need to calculate pro-rata platform fee or just debit what gave.
      // Simplification: We blindly debit exactly what we need to cover the refund?
      // If we refund Customer 100%, we debit Merchant 100% of (Order - Fee).
      // So if refundAmount == order.total, we debit settlement.settlementAmount.

      let debitAmount = 0;
      if (refundAmount >= settlement.orderAmount) {
        debitAmount = Number(settlement.settlementAmount);
      } else {
        // Partial refund logic
        // ratio = refundAmount / orderAmount
        // debit = settlementAmount * ratio
        const ratio = refundAmount / Number(settlement.orderAmount);
        debitAmount = Number(settlement.settlementAmount) * ratio;
      }

      // Debit Wallet
      const businessUserId = settlement.business.userId;

      await this.walletsService.debitWallet(
        businessUserId,
        debitAmount,
        reversalReference,
        `Refund Reversal: ${reason}`,
        queryRunner.manager,
        {
          transactionType: TransactionType.REFUND, // Make sure REFUND is in Enum or use WITHDRAWAL
          relatedSettlementId: settlement.id
        }
      );

      // Update Settlement Status if full reversal?
      // settlement.status = SettlementStatus.REVERSED; // If exists
      // await queryRunner.manager.save(Settlement, settlement);

      await queryRunner.commitTransaction();
      this.logger.log(`Settlement reversed for order ${orderId}: ${debitAmount} debited from user ${businessUserId}`);
      return true;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to reverse settlement for order ${orderId}`, error);
      // We probably want to throw here to Block the Refund Process?
      // If we can't get money back from merchant, do we stop refunding customer?
      // Yes, usually.
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Request a payout (withdrawal) from wallet to bank account
   */
  async requestPayout(userId: number, dto: RequestPayoutDto) {
    const { amount, bankAccountId, narration } = dto;

    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    // 1. Get Bank Account (verify ownership)
    const bankAccount = await this.bankAccountsService.getBankAccount(bankAccountId, userId);

    // 2. Debit Wallet & Create Transaction Record via WalletsService
    // We start a transaction here to coordinate with external provider call
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let transaction: Transaction;
    let wallet: Wallet; // We need wallet to get providerAccountId

    try {
      // We need to fetch wallet first to get providerAccountId for the transfer call later
      wallet = (await this.walletRepository.findOne({ where: { userId } }))!;
      if (!wallet) throw new NotFoundException('Wallet not found');

      // Debit Wallet (Locks funds)
      // This creates the 'DEBIT' transaction in DB
      const trxReference = `TRX-${uuidv4()}`;
      await this.walletsService.debitWallet(
        userId,
        amount,
        trxReference,
        narration || 'Wallet Withdrawal',
        queryRunner.manager,
        {
          transactionType: TransactionType.WITHDRAWAL,
          bankAccountId: bankAccount.id
        }
      );

      // Re-fetch created transaction to handle updates
      transaction = (await queryRunner.manager.findOne(Transaction, { where: { reference: trxReference } }))!;

      await queryRunner.commitTransaction(); // Commit debit before calling external API? 
      // If external API fails, we must Refund. 
      // Committing here is safer for "Money out of system" logic.

    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    // 3. Call Payment Provider (Outside DB Transaction)
    try {
      const transferResponse = await this.paymentService.transferToBank({
        amount,
        reference: transaction.reference,
        destinationAccountNumber: bankAccount.accountNumber,
        destinationBankCode: bankAccount.bankCode,
        narration: narration || 'Payout',
        sourceWalletReference: wallet.providerAccountId,
        currency: 'NGN',
      });

      // Update Transaction with provider reference
      transaction.providerReference = transferResponse.transferReference;
      // Status updates should happen via Webhook, but we can set PENDING/SUCCESS
      transaction.providerResponse = transferResponse;
      await this.transactionRepository.save(transaction);

      return {
        message: 'Payout initiated successfully',
        transaction,
      };

    } catch (transferError) {
      this.logger.error(`Transfer failed for TRX ${transaction.reference}`, transferError);

      // REVERSE DEBIT (REFUND)
      await this.walletsService.creditWallet(
        userId,
        amount,
        `${transaction.reference}-REV`,
        `Reversal for failed payout ${transaction.reference}`,
        undefined, // New transaction
        {
          transactionType: TransactionType.WALLET_FUNDING,
          originalReference: transaction.reference
        }
      );

      // Update original transaction
      transaction.status = TransactionStatus.FAILED;
      transaction.providerResponse = { error: transferError.message };
      await this.transactionRepository.save(transaction);

      throw new InternalServerErrorException('Payout failed processing');
    }
  }
}
