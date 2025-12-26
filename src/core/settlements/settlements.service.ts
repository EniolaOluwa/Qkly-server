import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PaymentService } from '../payment/payment.service';
import { BankAccountsService } from '../bank-accounts/bank-accounts.service'; // Fixed Import Path (check if correct)
import { User } from '../users/entity/user.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { Transaction, TransactionType, TransactionFlow, TransactionStatus } from '../transaction/entity/transaction.entity';
import { Settlement } from './entities/settlement.entity';
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
    private readonly paymentService: PaymentService,
    private readonly bankAccountsService: BankAccountsService,
    private readonly dataSource: DataSource,
  ) { }

  /**
   * Request a payout (withdrawal) from wallet to bank account
   */
  async requestPayout(userId: number, dto: RequestPayoutDto) {
    const { amount, bankAccountId, narration } = dto;

    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    // 1. Get Wallet and verify balance
    const wallet = await this.walletRepository.findOne({ where: { userId } });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Sync balance first to be sure
    try {
      const balance = await this.paymentService.getWalletBalance(wallet.providerAccountId);
      wallet.availableBalance = balance.availableBalance;
      await this.walletRepository.save(wallet);
    } catch (e) {
      this.logger.warn(`Could not sync balance for user ${userId} before payout`, e);
    }

    if (wallet.availableBalance < amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    // 2. Get Bank Account and verify ownership
    const bankAccount = await this.bankAccountsService.getBankAccount(bankAccountId, userId);

    // 3. Initiate Transaction (Atomic)
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create Transaction Record (PENDING)
      const transaction = this.transactionRepository.create({
        userId,
        reference: `TRX-${uuidv4()}`,
        type: TransactionType.WITHDRAWAL,
        flow: TransactionFlow.DEBIT,
        status: TransactionStatus.PENDING,
        amount,
        netAmount: amount, // Fees can be calculated here if needed
        currency: 'NGN',
        description: narration || 'Wallet Withdrawal',
        recipientAccountNumber: bankAccount.accountNumber,
        recipientAccountName: bankAccount.accountName,
        recipientBankName: bankAccount.bankName,
        balanceBefore: wallet.availableBalance,
        balanceAfter: wallet.availableBalance - amount, // Estimated
      });

      await queryRunner.manager.save(transaction);

      // Debit Wallet locally (Lock funds)
      wallet.availableBalance -= amount;
      await queryRunner.manager.save(wallet);

      await queryRunner.commitTransaction();

      // 4. Call Payment Provider
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

        // Update Transaction based on immediate response
        if (transferResponse.status === TransferStatus.SUCCESS || transferResponse.status === TransferStatus.PENDING) {
          // Keep as PENDING or SUCCESS depending on provider. Paystack 'success' often means queued.
          // We will rely on webhook to confirm final SUCCESS/FAILED.
          // But if it says success, we can assume it's moving.
        } else {
          // If immediate fail, revert
          throw new Error('Transfer failed at provider');
        }

        // Update provider reference
        transaction.providerReference = transferResponse.transferReference;
        await this.transactionRepository.save(transaction);

        return {
          message: 'Payout initiated successfully',
          transaction,
        };

      } catch (transferError) {
        this.logger.error(`Transfer failed for TRX ${transaction.reference}`, transferError);

        // Revert transaction and balance manually since we committed the DB transaction
        transaction.status = TransactionStatus.FAILED;
        transaction.providerResponse = { error: transferError.message };
        await this.transactionRepository.save(transaction);

        // Refund wallet
        wallet.availableBalance += amount;
        await this.walletRepository.save(wallet);

        throw new InternalServerErrorException('Payout failed processing');
      }

    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
