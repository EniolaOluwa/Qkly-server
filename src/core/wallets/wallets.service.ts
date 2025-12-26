import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { User } from '../users/entity/user.entity';
import { Wallet } from './entities/wallet.entity';
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
import { ErrorHelper } from '../../common/utils';

@Injectable()
export class WalletsService {
  private readonly logger = new Logger(WalletsService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    private readonly paymentService: PaymentService,
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
        customerName: generateWalletDto.customerName || `User ${userId}`,
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

      // Use PaymentService to transfer
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

      return plainToInstance(WalletTransferResponseDto, {
        status: transferResponse.status,
        responseBody: transferResponse,
      });
    } catch (error) {
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
   * Get payment methods for provider
   * Helper method for backward compatibility
   */
  getPaymentMethodsForProvider(paymentMethod: string): string[] {
    return this.paymentService.getPaymentMethodsForProvider(paymentMethod);
  }
}