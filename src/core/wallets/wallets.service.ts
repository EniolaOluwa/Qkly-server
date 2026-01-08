
import {
  BadRequestException,
  forwardRef,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ErrorHelper } from '../../common/utils';
import { ReferenceGenerator } from '../../common/utils/reference-generator.util';

import { BankAccountsService } from '../bank-accounts/bank-accounts.service';
import { BusinessesService } from '../businesses/businesses.service'; // Import
import { PaymentService } from '../payment/payment.service';
import { SystemConfigService } from '../system-config/system-config.service';
import { Transaction, TransactionFlow, TransactionStatus, TransactionType } from '../transaction/entity/transaction.entity';
import { User } from '../users/entity/user.entity';
import { WalletBalanceResponseDto } from './dto/wallet-response.dto';
import {
  WalletTransferOtpDto,
  WalletTransferRequestDto,
  WalletTransferResponseDto,
} from './dto/wallet-transfer.dto';
import {
  GenerateWalletDto,
  GenerateWalletResponseDto,
} from './dto/wallet.dto';
import { WithdrawalDto, WithdrawalResponseDto } from './dto/withdraw.dto';
import { Wallet } from './entities/wallet.entity';

import { UsersService } from '../users/users.service';

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
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => BusinessesService)) // Inject BusinessesService
    private readonly businessesService: BusinessesService,
    private readonly bankAccountsService: BankAccountsService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly systemConfigService: SystemConfigService,
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
        relations: ['wallet', 'profile'],
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

      if (!user.profile?.phone) {
        this.logger.error(`User ${userId} has no phone number in profile`);
        ErrorHelper.BadRequestException('User profile must have a phone number to create a wallet');
      }

      // Use PaymentService to create virtual account (Paystack DVA)
      let subaccountCode = undefined;

      // If bank details provided, create manual subaccount first
      if (generateWalletDto.bankDetails) {
        try {
          // 1. Create Subaccount on Paystack
          const businessName = user.profile?.firstName ? `${user.profile.firstName} ${user.profile.lastName} Store` : `Merchant ${userId}`;

          // call paymentService wrapper instead of private provider
          const subaccount = await this.paymentService.createSubaccount({
            business_name: businessName,
            settlement_bank: generateWalletDto.bankDetails.bankCode,
            account_number: generateWalletDto.bankDetails.accountNumber,
            percentage_charge: 0, // Configurable later
            description: `Settlement Account for ${businessName}`
          });

          if (subaccount && subaccount.subaccount_code) {
            subaccountCode = subaccount.subaccount_code;

            // 2. Save Subaccount to Business Profile (if user has one)
            if (subaccountCode) {
              await this.businessesService.updateSubaccountCode(userId, subaccountCode);
              this.logger.log(`Created Subaccount ${subaccountCode} for User ${userId}`);
            }
          }
        } catch (e) {
          this.logger.error(`Failed to create subaccount during wallet generation: ${e.message}`);
          // Continue to create DVA? Or Fail?
          // If DVA depends on it for splitting, we should probably fail or warn.
          // For now, let's log and proceed (unlinked DVA), but this means manual fix needed.
        }
      }

      const virtualAccount = await this.paymentService.createVirtualAccount({
        walletReference: generateWalletDto.walletReference ?? '',
        walletName: generateWalletDto.walletName,
        customerEmail: generateWalletDto.customerEmail || user.email,
        customerName: generateWalletDto.customerName || `${user.profile?.firstName} ${user.profile?.lastName}` || `User ${userId}`,
        bvn: generateWalletDto.bvn,
        dateOfBirth: generateWalletDto.dateOfBirth,
        currencyCode: generateWalletDto.currencyCode || 'NGN',
        phoneNumber: user.profile?.phone,
        firstName: user.profile?.firstName,
        lastName: user.profile?.lastName,
        subaccount: subaccountCode, // Link DVA to Subaccount
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

      // Propagate the actual error message
      const msg = error.response?.data?.message || error.message || 'Unknown error';
      ErrorHelper.InternalServerErrorException(`Failed to create wallet: ${msg}`);
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
      if (error instanceof HttpException) {
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

      // Wallet balance is maintained locally via transactions (Ledger System)
      // Paystack DVA does not provide individual account balances via API.

      let externalBalance: number | null = null;

      try {
        const businessAccount = await this.businessesService.getBusinessPaymentAccount(userId);
        if (businessAccount && businessAccount.providerSubaccountCode) {
          const subaccountData = await this.paymentService.fetchSubaccount(businessAccount.providerSubaccountCode);

          // Paystack Subaccount object usually has { balance: number, currency: string ... }
          // Note: 'balance' might be in cobo (minor unit) or major depending on endpoint version.
          // Verify integration returns. For now assuming major or we map it.
          console.log('DEBUG: Subaccount Data from Paystack:', JSON.stringify(subaccountData, null, 2));
          if (subaccountData) {
            // Paystack balances are often in minor units (kobo).
            // We assume integration layer returns raw response.
            // Documentation: data.balance (in kobo)
            let rawBalance = 0;
            if (subaccountData.balance !== undefined) {
              rawBalance = subaccountData.balance; // Convert to major units
            } else if (subaccountData.data && subaccountData.data.balance !== undefined) {
              rawBalance = subaccountData.data.balance;
            }

            externalBalance = rawBalance / 100; // Convert to Major

            // --- BALANCE LOCKING ---
            // Fetch PENDING withdrawals locally to prevent double-spend
            const pendingWithdrawalsSum = await this.transactionRepository
              .createQueryBuilder('trx')
              .select('SUM(trx.amount)', 'total')
              .where('trx.userId = :userId', { userId })
              .andWhere('trx.type = :type', { type: TransactionType.WITHDRAWAL })
              .andWhere('trx.status = :status', { status: TransactionStatus.PENDING })
              .getRawOne();

            const pendingAmount = Number(pendingWithdrawalsSum?.total || 0);

            if (pendingAmount > 0) {
              this.logger.log(`User ${userId} has pending withdrawals: ${pendingAmount}. Locking from balance.`);
              externalBalance = Math.max(0, externalBalance - pendingAmount);
            }
          }
        }
      } catch (e) {
        this.logger.warn(`Failed to fetch external subaccount balance for user ${userId}: ${e.message}`);
      }

      const walletDto = plainToInstance(WalletBalanceResponseDto, {
        walletReference: wallet.providerAccountId,
        accountNumber: wallet.accountNumber,
        accountName: wallet.accountName,
        bankName: wallet.bankName,
        bankCode: wallet.bankCode,
        availableBalance: externalBalance !== null ? externalBalance : wallet.availableBalance,
        ledgerBalance: externalBalance !== null ? externalBalance : wallet.ledgerBalance,
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
          fee: dto.fee, // Pass fee to debit logic
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

      // Check if we should skip balance update (e.g. for Split Payments where funds are external)
      const skipBalanceUpdate = metadata?.skipBalanceUpdate === true;

      // Update balance ONLY if not skipped
      if (!skipBalanceUpdate) {
        wallet.availableBalance = Number(wallet.availableBalance) + Number(amount);
        wallet.ledgerBalance = Number(wallet.ledgerBalance) + Number(amount);
        await em.save(Wallet, wallet);
      }

      // Create Transaction Record
      const transaction = em.create(Transaction, {
        userId,
        reference,
        type: TransactionType.WALLET_FUNDING, // Default, can be overridden if passed
        flow: TransactionFlow.CREDIT,
        status: TransactionStatus.SUCCESS,
        amount,
        netAmount: amount,
        currency: wallet.currency,
        description,
        // If skipped, balance remains same as before (or current state)
        balanceBefore: Number(wallet.availableBalance) - (skipBalanceUpdate ? 0 : Number(amount)),
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

      const fee = metadata?.fee || 0;
      const totalDeduction = Number(amount) + Number(fee);

      if (Number(wallet.availableBalance) < totalDeduction) {
        ErrorHelper.BadRequestException(`Insufficient wallet balance. Amount: ${amount}, Fee: ${fee}, Total: ${totalDeduction}, Balance: ${wallet.availableBalance}`);
      }

      // Update balance
      wallet.availableBalance = Number(wallet.availableBalance) - totalDeduction;
      wallet.ledgerBalance = Number(wallet.ledgerBalance) - totalDeduction;

      await em.save(Wallet, wallet);

      // Create Transaction Record
      const transaction = em.create(Transaction, {
        userId,
        reference,
        type: TransactionType.WITHDRAWAL, // Default
        flow: TransactionFlow.DEBIT,
        status: TransactionStatus.SUCCESS,
        amount: totalDeduction, // Total amount leaving wallet
        fee: fee,
        netAmount: amount, // Amount sent / used
        currency: wallet.currency,
        description,
        balanceBefore: Number(wallet.availableBalance) + totalDeduction,
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
    // 1. Detect Scenario: Merchant Subaccount vs Personal Wallet
    const businessAccount = await this.businessesService.getBusinessPaymentAccount(userId);
    const isMerchantSubaccount = businessAccount && businessAccount.providerSubaccountCode;

    if (isMerchantSubaccount) {
      // --- MERCHANT SUBACCOUNT PAYOUT API ---
      // We ignore 'dto.bankAccountId' because Subaccounts can ONLY pay out to their linked Primary Bank Account.
      // We ignore 'dto.pin' check technically because the provider manages ownership, 
      // BUT for security we SHOULD still validate the user's local PIN to prevent unauthorized access to their session.

      // 1. Validate PIN
      if (!dto.pin) ErrorHelper.BadRequestException('Transaction PIN is required');
      const isPinValid = await this.usersService.validateTransactionPin(userId, dto.pin);
      if (!isPinValid) ErrorHelper.BadRequestException('Invalid Transaction PIN');

      // 1a. Check for PIN Reset Restriction (24-hour cooldown)
      const restriction = await this.usersService.getTransactionPinResetRestriction(userId);
      if (restriction.restricted) {
        ErrorHelper.BadRequestException(
          `Withdrawals are restricted for ${restriction.remainingHours} hour(s) after a PIN reset. Restriction ends at ${restriction.endsAt?.toLocaleString()}.`,
        );
      }

      // 1b. Validate Balance (Fetch live from provider)
      // We must ensure the user has enough funds in their Subaccount before requesting payout.
      const walletData = await this.getUserWalletWithBalance(userId);
      const availableBalance = walletData.availableBalance;

      if (dto.amount > availableBalance) {
        ErrorHelper.BadRequestException('Insufficient funds in subaccount');
      }

      // 2. Execute Payout via PaymentService
      // Note: We don't deduct local wallet balance because the source is external. 
      // But we DO record the transaction.

      // 2. Execute Payout Logic
      // Since standard Paystack Subaccounts settle manually or automatically (and API does not support direct "payout" trigger for splits effortlessly without transfer balance),
      // we treat this as a "Record Payout" request which aligns with the manual settlement schedule or manual dashboard action.
      // In a real automated Managed Account flow, this would call transferToBank. 
      // For now, we simply record the intent.

      const reference = ReferenceGenerator.generate('WDR');

      // 3. Record Transaction
      const transaction = this.transactionRepository.create({
        userId,
        amount: dto.amount,
        netAmount: dto.amount,
        fee: 0,
        type: TransactionType.WITHDRAWAL,
        flow: TransactionFlow.DEBIT,
        status: TransactionStatus.PENDING, // Pending until confirmed logic or webhook?
        reference: reference, // Use local ref
        description: dto.narration || 'Merchant Payout',
        currency: 'NGN',
        metadata: {
          subaccountCode: businessAccount.providerSubaccountCode,
          source: 'SUBACCOUNT_PAYOUT'
        }
      });
      await this.transactionRepository.save(transaction);

      this.logger.log(`Recorded Subaccount Payout for ${userId}: ${dto.amount} (Ref: ${reference})`);

      return {
        success: true,
        message: 'Payout initiated successfully', // User message remains friendly
        reference: reference,
      };

    } else {
      // --- STANDARD WALLET WITHDRAWAL (Fallback for non-merchants) ---

      // 1. Validate Bank Account
      const bankAccount = await this.bankAccountsService.getBankAccount(dto.bankAccountId, userId);
      if (!bankAccount) ErrorHelper.NotFoundException('Bank account not found or does not belong to user');

      // 2. Validate PIN
      if (!dto.pin) ErrorHelper.BadRequestException('Transaction PIN is required');
      const isPinValid = await this.usersService.validateTransactionPin(userId, dto.pin);
      if (!isPinValid) ErrorHelper.BadRequestException('Invalid Transaction PIN');

      // 2a. Check for PIN Reset Restriction (24-hour cooldown)
      const restriction = await this.usersService.getTransactionPinResetRestriction(userId);
      if (restriction.restricted) {
        ErrorHelper.BadRequestException(
          `Withdrawals are restricted for ${restriction.remainingHours} hour(s) after a PIN reset. Restriction ends at ${restriction.endsAt?.toLocaleString()}.`,
        );
      }

      // 3. Check Balance & Calculate Fee
      const wallet = await this.walletRepository.findOne({ where: { userId } });
      if (!wallet) ErrorHelper.NotFoundException('Wallet not found');

      const fee = this.calculateTransferFee(dto.amount);
      const totalDebit = Number(dto.amount) + Number(fee);

      if (Number(wallet.availableBalance) < totalDebit) {
        ErrorHelper.BadRequestException('Insufficient funds');
      }

      // 4. Construct Transfer Payload
      const transferPayload: WalletTransferRequestDto = {
        amount: dto.amount,
        fee: fee,
        reference: ReferenceGenerator.generate('WDR'),
        narration: dto.narration || 'Withdrawal',
        destinationAccountNumber: bankAccount.accountNumber,
        destinationBankCode: bankAccount.bankCode,
        currency: bankAccount.currency,
        sourceAccountNumber: wallet.providerAccountId,
        async: false,
      };

      // 5. Execute
      const transferResult = await this.transferToWalletOrBank(transferPayload);

      return {
        success: transferResult.status === 'SUCCESS' || transferResult.status === 'PENDING',
        message: 'Withdrawal initiated successfully',
        reference: transferPayload.reference,
        data: transferResult,
      };
    }
  }


  calculateTransferFee(amount: number): number {
    if (amount <= 5000) {
      return 10;
    } else if (amount <= 50000) {
      return 25;
    } else {
      return 50;
    }
  }

  // ============================================================
  // INSTANT PAYOUT (Option 2: Main Balance Mode)
  // ============================================================

  /**
   * Instant payout to merchant's bank account
   * Uses Paystack Transfer API - money sent within minutes
   * Requires: Transaction PIN, bank account with providerRecipientCode
   */
  async instantPayout(userId: number, dto: WithdrawalDto): Promise<WithdrawalResponseDto> {
    // 1. Validate PIN
    if (!dto.pin) ErrorHelper.BadRequestException('Transaction PIN is required');
    const isPinValid = await this.usersService.validateTransactionPin(userId, dto.pin);
    if (!isPinValid) ErrorHelper.BadRequestException('Invalid Transaction PIN');

    // 2. Check for PIN Reset Restriction (24-hour cooldown)
    const restriction = await this.usersService.getTransactionPinResetRestriction(userId);
    if (restriction.restricted) {
      ErrorHelper.BadRequestException(
        `Withdrawals are restricted for ${restriction.remainingHours} hour(s) after a PIN reset.`,
      );
    }

    // 3. Get bank account with recipient code
    const bankAccount = await this.bankAccountsService.getBankAccount(dto.bankAccountId, userId);
    if (!bankAccount) {
      ErrorHelper.NotFoundException('Bank account not found');
    }

    if (!bankAccount.providerRecipientCode) {
      ErrorHelper.BadRequestException(
        'Bank account not set up for instant payout. Please remove and re-add your bank account.',
      );
    }

    // 4. Check balance (from local wallet for Main Balance mode)
    const wallet = await this.walletRepository.findOne({ where: { userId } });
    if (!wallet) {
      ErrorHelper.NotFoundException('Wallet not found');
    }

    const fee = this.calculateTransferFee(dto.amount);
    const totalDebit = Number(dto.amount) + Number(fee);

    if (Number(wallet.availableBalance) < totalDebit) {
      ErrorHelper.BadRequestException('Insufficient funds');
    }

    // 5. Generate reference and initiate transfer via Paystack
    const reference = ReferenceGenerator.generate('WDR');

    try {
      const transferResult = await this.paymentService.transferToBank({
        amount: dto.amount,
        reference,
        destinationAccountNumber: bankAccount.accountNumber,
        destinationBankCode: bankAccount.bankCode,
        destinationAccountName: bankAccount.accountName,
        currency: bankAccount.currency || 'NGN',
        narration: dto.narration || 'Instant Payout',
      });

      // 6. Deduct from local wallet
      wallet.availableBalance = Number(wallet.availableBalance) - totalDebit;
      await this.walletRepository.save(wallet);

      // 7. Record transaction
      const transaction = this.transactionRepository.create({
        userId,
        amount: dto.amount,
        netAmount: dto.amount,
        fee,
        type: TransactionType.WITHDRAWAL,
        flow: TransactionFlow.DEBIT,
        status: transferResult.status === 'SUCCESS' ? TransactionStatus.SUCCESS : TransactionStatus.PENDING,
        reference,
        providerReference: transferResult.transferReference,
        description: dto.narration || 'Instant Payout',
        currency: 'NGN',
        metadata: {
          bankAccountId: bankAccount.id,
          recipientCode: bankAccount.providerRecipientCode,
          source: 'INSTANT_PAYOUT',
        },
      });
      await this.transactionRepository.save(transaction);

      this.logger.log(`Instant payout initiated for user ${userId}: ${dto.amount} (Ref: ${reference})`);

      return {
        success: true,
        message: 'Instant payout initiated. Funds will arrive within minutes.',
        reference,
        data: transferResult,
      };
    } catch (error) {
      this.logger.error(`Instant payout failed for user ${userId}: ${error.message}`);
      ErrorHelper.InternalServerErrorException(`Payout failed: ${error.message}`);
    }
  }

  /**
   * Process Webhook Events (Transfers)
   */
  async processWebhook(event: any): Promise<void> {
    // Handle both raw Paystack payload and standardized WebhookEventDto
    const rawPayload = event.rawPayload || event;
    const eventType = rawPayload.event;
    const data = rawPayload.data;

    if (!eventType || !['transfer.success', 'transfer.failed', 'transfer.reversed'].includes(eventType)) {
      return;
    }

    this.logger.log(`Processing Transfer Webhook: ${eventType} for Ref: ${data?.reference}`);

    const reference = data.reference;
    // Transaction reference might match directly or be in providerReference
    const transaction = await this.transactionRepository.findOne({
      where: [
        { reference: reference },
        { providerReference: reference } // Sometimes provider sends their ID
      ]
    });

    if (!transaction) {
      // HANDLE T+1 AUTO-SETTLEMENTS (Unmatched References)
      if (eventType === 'transfer.success' && data.recipient?.details?.account_number) {
        const accountNumber = data.recipient.details.account_number;
        this.logger.log(`Unmatched transfer success. Attempting to match by account number: ${accountNumber}`);

        const bankAccount = await this.bankAccountsService.findByAccountNumber(accountNumber);

        if (bankAccount && bankAccount.user) {
          const userId = bankAccount.userId;
          const amount = data.amount / 100; // Paystack sends kobo

          // 1. Check for PENDING "Subaccount Payout" requests
          const pendingPayout = await this.transactionRepository.findOne({
            where: {
              userId,
              type: TransactionType.WITHDRAWAL,
              status: TransactionStatus.PENDING,
              // We could also check amount match, but amounts might differ due to fees.
              // For T+1, it usually clears the balance.
            },
            order: { createdAt: 'ASC' } // Match oldest first
          });

          if (pendingPayout) {
            this.logger.log(`Matched auto-settlement ${reference} to Pending Payout ${pendingPayout.reference}`);
            pendingPayout.status = TransactionStatus.SUCCESS;
            pendingPayout.providerReference = reference; // Save real ref
            pendingPayout.metadata = {
              ...pendingPayout.metadata,
              webhookData: data,
              matchType: 'AUTO_RESOLVED',
              originalReference: pendingPayout.reference
            };
            // Optional: Update amount if significantly different?
            await this.transactionRepository.save(pendingPayout);
            return;
          } else {
            // 2. No pending payout found -> Create "Auto Settlement" record
            this.logger.log(`Creating new Auto-Settlement record for execution ${reference}`);
            const newTx = this.transactionRepository.create({
              userId,
              amount: amount,
              netAmount: amount,
              fee: 0,
              type: TransactionType.WITHDRAWAL,
              flow: TransactionFlow.DEBIT,
              status: TransactionStatus.SUCCESS,
              reference: reference, // Use Paystack Ref
              description: 'Automatic Settlement (Payout)',
              currency: data.currency || 'NGN',
              metadata: {
                webhookData: data,
                source: 'AUTO_SETTLEMENT'
              }
            });
            await this.transactionRepository.save(newTx);
            return;
          }
        }
      }

      this.logger.warn(`Transaction not found for webhook ref: ${reference}`);
      return;
    }

    if (transaction.status === TransactionStatus.SUCCESS || transaction.status === TransactionStatus.FAILED) {
      this.logger.log(`Transaction ${transaction.reference} already processed.`);
      return;
    }

    if (eventType === 'transfer.success') {
      transaction.status = TransactionStatus.SUCCESS;
      transaction.metadata = { ...transaction.metadata, webhookData: data };
      await this.transactionRepository.save(transaction);
      this.logger.log(`Transaction ${transaction.reference} marked as SUCCESS.`);
    } else {
      // Failed or Reversed
      transaction.status = eventType === 'transfer.reversed' ? TransactionStatus.REVERSED : TransactionStatus.FAILED;
      transaction.metadata = { ...transaction.metadata, webhookData: data, failureReason: data.reason || 'Webhook Failed' };
      await this.transactionRepository.save(transaction);

      this.logger.log(`Transaction ${transaction.reference} marked as ${transaction.status}.`);

      // REFUND LOGIC
      // If this was a Standard Wallet withdrawal (Custodial), we debited the ledger. We must refund.
      // If it was Subaccount Payout, we didn't debit ledger (only locked via pending check). 
      // Setting status to FAILED automatically releases the lock (count decreases).

      const isSubaccountPayout = transaction.metadata?.source === 'SUBACCOUNT_PAYOUT';

      if (!isSubaccountPayout && transaction.type === TransactionType.WITHDRAWAL) {
        if (!transaction.userId) {
          this.logger.warn(`Cannot refund transaction ${transaction.reference}: missing userId`);
          return;
        }

        this.logger.log(`Refunding failed withdrawal for Standard Wallet: ${transaction.reference}`);
        await this.creditWallet(
          transaction.userId,
          Number(transaction.amount || 0) + Number(transaction.fee || 0), // Refund full amount + fee
          `REF-${transaction.reference}`,
          `Refund for failed withdrawal ${transaction.reference}`,
          undefined,
          {
            originalReference: transaction.reference,
            transactionType: TransactionType.REFUND
          }
        );
      }
    }
  }
}