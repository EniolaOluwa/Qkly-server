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
import { User } from '../users/user.entity';
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

@Injectable()
export class WalletsService {
  private readonly logger = new Logger(WalletsService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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
      const user = await this.userRepository.findOne({ where: { id: userId } });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.walletReference) {
        throw new BadRequestException('User already has a wallet');
      }

      // Use PaymentService to create virtual account
      const virtualAccount = await this.paymentService.createVirtualAccount({
        walletReference: generateWalletDto.walletReference ?? '',
        walletName: generateWalletDto.walletName,
        customerEmail: generateWalletDto.customerEmail,
        customerName:
          generateWalletDto.customerName ??
          `${user.firstName} ${user.lastName}`,
        bvn: generateWalletDto.bvn,
        dateOfBirth: generateWalletDto.dateOfBirth,
        currencyCode: generateWalletDto.currencyCode || 'NGN',
      });

      // Update user with wallet information
      await this.userRepository.update(userId, {
        walletReference: virtualAccount.walletReference,
        walletAccountNumber: virtualAccount.accountNumber,
        walletAccountName: virtualAccount.accountName,
        walletBankName: virtualAccount.bankName,
        walletBankCode: virtualAccount.bankCode,
      });

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

      throw new InternalServerErrorException('Failed to create wallet');
    }
  }

  /**
   * Get user wallet details
   */
  async getUserWallet(userId: number): Promise<any> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: [
          'id',
          'walletReference',
          'walletAccountNumber',
          'walletAccountName',
          'walletBankName',
          'walletBankCode',
        ],
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (!user.walletReference) {
        throw new NotFoundException('User does not have a wallet');
      }

      return {
        walletReference: user.walletReference,
        accountNumber: user.walletAccountNumber,
        accountName: user.walletAccountName,
        bankName: user.walletBankName,
        bankCode: user.walletBankCode,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
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
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: [
          'id',
          'walletReference',
          'walletAccountNumber',
          'walletAccountName',
          'walletBankName',
          'walletBankCode',
        ],
      });

      if (!user) throw new NotFoundException('User not found');
      if (!user.walletReference)
        throw new BadRequestException('User does not have a wallet');

      // Use PaymentService to get balance
      const balance = await this.paymentService.getWalletBalance(
        user.walletReference,
      );

      const walletDto = plainToInstance(WalletBalanceResponseDto, {
        walletReference: user.walletReference,
        accountNumber: user.walletAccountNumber,
        accountName: user.walletAccountName,
        bankName: user.walletBankName,
        bankCode: user.walletBankCode,
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
      throw new InternalServerErrorException('Transfer failed');
    }
  }

  /**
   * Validate transfer OTP (provider-specific)
   */
  async validateTransferOtp(payload: WalletTransferOtpDto) {
    try {
      const dto = plainToInstance(WalletTransferOtpDto, payload);
      await validateOrReject(dto);

      // This is Monnify-specific, so we'll only call it if using Monnify
      const activeProvider = this.paymentService.getActiveProvider();

      if (activeProvider === 'MONNIFY') {
        // Get Monnify provider instance and call OTP validation
        // This would require additional implementation
        throw new Error('OTP validation not yet implemented for current provider');
      }

      throw new BadRequestException(
        'OTP validation not supported by current payment provider',
      );
    } catch (error) {
      this.logger.error('OTP validation failed', error.stack);
      throw new InternalServerErrorException('OTP validation failed');
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
  getPaymentMethodsForMonnify(paymentMethod: string): string[] {
    return this.paymentService.getPaymentMethodsForProvider(paymentMethod);
  }
}