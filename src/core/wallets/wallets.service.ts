
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { User } from '../users/entity/user.entity';
import { Wallet } from './entities/wallet.entity';
import { Transaction, TransactionType, TransactionFlow, TransactionStatus } from '../transaction/entity/transaction.entity';
import { DataSource, EntityManager } from 'typeorm';
import {
  GenerateWalletDto,
  GenerateWalletResponseDto,
} from './dto/wallet.dto';
import { WalletBalanceResponseDto } from './dto/wallet-response.dto';
import {
  WalletTransferOtpDto,
  WalletTransferRequestDto,
  WalletTransferResponseDto,
} from './dto/wallet-transfer.dto';
import { PaymentService } from '../payment/payment.service';
import { BankAccountsService } from '../bank-accounts/bank-accounts.service';
import { WithdrawalDto, WithdrawalResponseDto } from './dto/withdraw.dto';
import { ErrorHelper } from '../../common/utils';

@Injectable()
export class WalletsService {
  private readonly logger = new Logger(WalletsService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @Inject(forwardRef(() => PaymentService))
    private readonly paymentService: PaymentService,
    private readonly bankAccountsService: BankAccountsService,
    private readonly dataSource: DataSource,
  ) { }

  /**
   * Generate wallet for user using configured payment provider
   */
  async generateWallet(
    userId: number,
    generateWalletDto: GenerateWalletDto,
  ): Promise<GenerateWalletResponseDto> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['wallet'],
      });

      if (!user) {
        ErrorHelper.NotFoundException('User not found');
      }

      // Check if user already has a wallet
      const existingWallet = await this.walletRepository.findOne({
        where: { userId },
      });

      if (existingWallet) {
        ErrorHelper.BadRequestException('User already has a wallet');
      }

      // Use PaymentService to create virtual account (Paystack DVA)
      const virtualAccount = await this.paymentService.createVirtualAccount({
        walletReference: generateWalletDto.walletReference ?? '',
        walletName: generateWalletDto.walletName,
        customerEmail: generateWalletDto.customerEmail,
        customerName: generateWalletDto.customerName || `User ${userId} `,
        bvn: generateWalletDto.bvn,
        dateOfBirth: generateWalletDto.dateOfBirth,
        currencyCode: generateWalletDto.currencyCode || 'NGN',
      });

      // Create Wallet entity
      const wallet = new Wallet();
      wallet.userId = userId;
      wallet.provider = 'paystack' as any;
      wallet.providerCustomerId = virtualAccount.walletReference;
      wallet.providerAccountId = virtualAccount.walletReference;
      wallet.accountNumber = virtualAccount.accountNumber;
      wallet.accountName = virtualAccount.accountName;
      wallet.bankName = virtualAccount.bankName;
      wallet.bankCode = virtualAccount.bankCode;
      wallet.status = 'active' as any;
      wallet.currency = virtualAccount.currencyCode || 'NGN';
      wallet.availableBalance = 0;
      wallet.pendingBalance = 0;
      wallet.ledgerBalance = 0;
      wallet.providerMetadata = virtualAccount;
      wallet.activatedAt = new Date();

      await this.walletRepository.save(wallet);

      return {
        message: 'Wallet created successfully',
        success: true,
        walletReference: virtualAccount.walletReference,
        accountNumber: virtualAccount.accountNumber,
        accountName: virtualAccount.accountName,
        bankName: virtualAccount.bankName,
        bankCode: virtualAccount.bankCode,
        currencyCode: virtualAccount.currencyCode,
        createdOn: virtualAccount.createdOn,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      this.logger.error(
        'Wallet generation failed:',
        error.response?.data || error.message,
      );

      ErrorHelper.InternalServerErrorException('Failed to create wallet');
    }
  }

  /**
   * Get user wallet details
   */
  async getUserWallet(userId: number): Promise<any> {
    try {
      const wallet = await this.walletRepository.findOne({
        where: { userId },
      });

      if (!wallet) {
        ErrorHelper.NotFoundException('User does not have a wallet');
      }

      return {
        walletReference: wallet.providerAccountId,
        accountNumber: wallet.accountNumber,
        accountName: wallet.accountName,
        bankName: wallet.bankName,
        bankCode: wallet.bankCode,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      ErrorHelper.InternalServerErrorException(
        'Failed to retrieve wallet information',
      );
    }
  }

  /**
   * Get user wallet with balance
   */
  async getUserWalletWithBalance(
    userId: number,
  ): Promise<WalletBalanceResponseDto> {
    try {
      const wallet = await this.walletRepository.findOne({
        where: { userId },
      });

      if (!wallet) {
        ErrorHelper.NotFoundException('User does not have a wallet');
      }

      // Use PaymentService to get balance from Paystack
      const balance = await this.paymentService.getWalletBalance(
        wallet.providerAccountId,
      );

      // Update wallet balances in database
      wallet.availableBalance = balance.availableBalance;
      wallet.ledgerBalance = balance.ledgerBalance;
      await this.walletRepository.save(wallet);

      const walletDto = plainToInstance(WalletBalanceResponseDto, {
        walletReference: wallet.providerAccountId,
        accountNumber: wallet.accountNumber,
        accountName: wallet.accountName,
        bankName: wallet.bankName,
        bankCode: wallet.bankCode,
        availableBalance: balance.availableBalance,
        ledgerBalance: balance.ledgerBalance,
      });

      return walletDto;
    } catch (error) {
      this.logger.error('Wallet retrieval with balance failed:', error.stack);
      throw error;
    }
  }

  /**
   * Transfer to wallet or bank account
   */
  async transferToWalletOrBank(
    payload: WalletTransferRequestDto,
  ): Promise<WalletTransferResponseDto> {
    try {
      // Validate and transform payload
      const dto = plainToInstance(WalletTransferRequestDto, payload);
      await validateOrReject(dto);

      // 1. Get User ID from wallet reference (Assuming sourceAccountNumber is wallet reference)
      // Since we don't have userId in DTO, we must lookup wallet by reference
      const sourceWallet = await this.walletRepository.findOne({
        where: { providerAccountId: dto.sourceAccountNumber },
      });

      if (!sourceWallet) {
        ErrorHelper.NotFoundException('Source wallet not found');
      }

      // 2. Optimistic Debit (Local)
      // This ensures funds are reserved before external call
      await this.debitWallet(
        sourceWallet.userId,
        dto.amount,
        dto.reference,
        `Transfer to ${dto.destinationAccountNumber}`,
        undefined,
        {
          transactionType: TransactionType.WITHDRAWAL,
          destinationBank: dto.destinationBankCode,
          destinationAccount: dto.destinationAccountNumber,
        }
      );

      try {
        // 3. Execute External Transfer
        const transferResponse = await this.paymentService.transferToBank({
          amount: dto.amount,
          reference: dto.reference,
          narration: dto.narration,
          destinationAccountNumber: dto.destinationAccountNumber,
          destinationBankCode: dto.destinationBankCode ?? '',
          currency: dto.currency || 'NGN',
          sourceWalletReference: dto.sourceAccountNumber,
          metadata: {
            async: dto.async ?? false,
          },
        });

        // 4. Return Success
        return plainToInstance(WalletTransferResponseDto, {
          status: transferResponse.status,
          responseBody: transferResponse,
        });

      } catch (externalError) {
        this.logger.error(`External transfer failed for ref ${dto.reference}. Initiating reversal.`, externalError);

        // 5. Reversal Logic (Credit back)
        const reversalRef = `REV-${dto.reference}`;
        await this.creditWallet(
          sourceWallet.userId,
          dto.amount,
          reversalRef,
          `Reversal: Failed transfer ${dto.reference}`,
          undefined,
          {
            originalReference: dto.reference,
            transactionType: TransactionType.REFUND, // Marking as Refund/Reversal
            reason: externalError.message
          }
        );

        // Update original transaction status to REVERSED (optional but good for tracking)
        await this.transactionRepository.update(
          { reference: dto.reference },
          { status: TransactionStatus.REVERSED }
        );

        throw externalError;
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Transfer to wallet/bank failed', error.stack);
      ErrorHelper.InternalServerErrorException('Transfer failed');
    }
  }

  /**
   * Validate transfer OTP
   * Note: Paystack does not require OTP validation for transfers
   */
  async validateTransferOtp(payload: WalletTransferOtpDto) {
    try {
      const dto = plainToInstance(WalletTransferOtpDto, payload);
      await validateOrReject(dto);

      // Paystack handles transfers without OTP validation
      ErrorHelper.BadRequestException(
        'OTP validation not required for Paystack transfers',
      );
    } catch (error) {
      this.logger.error('OTP validation failed', error.stack);
      ErrorHelper.InternalServerErrorException('OTP validation failed');
    }
  }

  /**
   * Resolve bank account details
   */
  async resolveBankAccount(
    accountNumber: string,
    bankCode: string,
  ): Promise<any> {
    try {
      return await this.paymentService.resolveBankAccount({
        accountNumber,
        bankCode,
      });
    } catch (error) {
      this.logger.error('Bank account resolution failed', error.stack);
      throw error;
    }
  }

  /**
   * Get list of banks
   */
  async getBankList(): Promise<Array<{ code: string; name: string }>> {
    try {
      return await this.paymentService.getBankList();
    } catch (error) {
      this.logger.error('Failed to get bank list', error.stack);
      throw error;
    }
  }

  /**
   * Get wallet transactions
   */
  async getWalletTransactions(userId: number, page: number = 1, limit: number = 20): Promise<any> {
    try {
      const skippedItems = (page - 1) * limit;

      const [transactions, total] = await this.transactionRepository.findAndCount({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: limit,
        skip: skippedItems,
      });

      return {
        data: transactions,
        meta: {
          totalItems: total,
          itemCount: transactions.length,
          itemsPerPage: limit,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
        },
      };
    } catch (error) {
      this.logger.error('Failed to retrieve transactions', error.stack);
      ErrorHelper.InternalServerErrorException('Failed to retrieve transactions');
    }
  }

  /**
   * Get payment methods for provider
   * Helper method for backward compatibility
   */
  /**
   * Credit user wallet (Internal method)
   * Handles local DB balance update and transaction logging
   */
  async creditWallet(
    userId: number,
    amount: number,
    reference: string,
    description: string,
    manager?: EntityManager,
    metadata?: any,
  ): Promise<Wallet> {
    const execute = async (em: EntityManager) => {
      const wallet = await em.findOne(Wallet, {
        where: { userId },
      });

      if (!wallet) {
        ErrorHelper.NotFoundException('User wallet not found');
      }

      // Update balance
      wallet.availableBalance = Number(wallet.availableBalance) + Number(amount);
      wallet.ledgerBalance = Number(wallet.ledgerBalance) + Number(amount);

      await em.save(Wallet, wallet);

      // Create Transaction Record
      const transaction = em.create(Transaction, {
        userId,
        reference,
        type: TransactionType.WALLET_FUNDING, // Default, can be overridden if passed, but for now fixed or we add param
        flow: TransactionFlow.CREDIT,
        status: TransactionStatus.SUCCESS,
        amount,
        netAmount: amount,
        currency: wallet.currency,
        description,
        balanceBefore: Number(wallet.availableBalance) - Number(amount),
        balanceAfter: Number(wallet.availableBalance),
        metadata,
      });

      // Override type if metadata specifies it (hacky but flexible)
      if (metadata?.transactionType) {
        transaction.type = metadata.transactionType;
      }

      await em.save(Transaction, transaction);

      return wallet;
    };

    if (manager) {
      return execute(manager);
    } else {
      return this.dataSource.transaction(execute);
    }
  }

  /**
   * Debit user wallet (Internal method)
   */
  async debitWallet(
    userId: number,
    amount: number,
    reference: string,
    description: string,
    manager?: EntityManager,
    metadata?: any,
  ): Promise<Wallet> {
    const execute = async (em: EntityManager) => {
      const wallet = await em.findOne(Wallet, {
        where: { userId },
      });

      if (!wallet) {
        ErrorHelper.NotFoundException('User wallet not found');
      }

      if (Number(wallet.availableBalance) < Number(amount)) {
        ErrorHelper.BadRequestException('Insufficient wallet balance');
      }

      // Update balance
      wallet.availableBalance = Number(wallet.availableBalance) - Number(amount);
      wallet.ledgerBalance = Number(wallet.ledgerBalance) - Number(amount);

      await em.save(Wallet, wallet);

      // Create Transaction Record
      const transaction = em.create(Transaction, {
        userId,
        reference,
        type: TransactionType.WITHDRAWAL, // Default
        flow: TransactionFlow.DEBIT,
        status: TransactionStatus.SUCCESS,
        amount,
        netAmount: amount,
        currency: wallet.currency,
        description,
        balanceBefore: Number(wallet.availableBalance) + Number(amount),
        balanceAfter: Number(wallet.availableBalance),
        metadata,
      });

      if (metadata?.transactionType) {
        transaction.type = metadata.transactionType;
      }

      await em.save(Transaction, transaction);

      return wallet;
    };

    if (manager) {
      return execute(manager);
    } else {
      return this.dataSource.transaction(execute);
    }
  }

  getPaymentMethodsForProvider(paymentMethod: string): string[] {
    return this.paymentService.getPaymentMethodsForProvider(paymentMethod);
  }

  /**
   * Withdraw funds to a saved bank account
   */
  async withdrawToBankAccount(userId: number, dto: WithdrawalDto): Promise<WithdrawalResponseDto> {
    // 1. Validate Bank Account
    const bankAccount = await this.bankAccountsService.getBankAccount(dto.bankAccountId, userId);

    if (!bankAccount) {
      ErrorHelper.NotFoundException('Bank account not found or does not belong to user');
    }

    // 2. Validate PIN (TODO: Integrate with UserSecurityService when ready)
    if (!dto.pin) {
      ErrorHelper.BadRequestException('Transaction PIN is required');
    }
    // const isPinValid = await this.userSecurityService.validatePin(userId, dto.pin);
    // if (!isPinValid) ErrorHelper.BadRequestException('Invalid PIN');

    // 3. Get User Wallet to get reference
    const wallet = await this.walletRepository.findOne({ where: { userId } });
    if (!wallet) ErrorHelper.NotFoundException('Wallet not found');

    // 4. Construct Transfer Payload
    const transferPayload: WalletTransferRequestDto = {
      amount: dto.amount,
      reference: `WDR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      narration: dto.narration || 'Withdrawal to Bank Account',
      destinationAccountNumber: bankAccount.accountNumber,
      destinationBankCode: bankAccount.bankCode,
      currency: bankAccount.currency,
      sourceAccountNumber: wallet.providerAccountId,
      async: false,
    };

    // 5. Execute Transfer
    const transferResult = await this.transferToWalletOrBank(transferPayload);

    return {
      success: transferResult.status === 'SUCCESS' || transferResult.status === 'PENDING',
      message: 'Withdrawal initiated successfully',
      reference: transferPayload.reference,
    };
  }
}