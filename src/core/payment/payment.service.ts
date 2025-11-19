// src/modules/payments/payment.service.ts

import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IPaymentProvider } from './interfaces/payment-provider.interface';
import { MonnifyProvider } from './providers/monnify.provider';
import { PaystackProvider } from './providers/paystack.provider';
import {
  CreateVirtualAccountDto,
  VirtualAccountResponseDto,
  WalletBalanceDto,
  InitializePaymentRequestDto,
  InitializePaymentResponseDto,
  VerifyPaymentResponseDto,
  TransferRequestDto,
  TransferResponseDto,
  ResolveBankAccountDto,
  BankAccountDetailsDto,
  WebhookEventDto,
  PaymentProviderType,
} from './dto/payment-provider.dto';

/**
 * Payment Service - Unified interface for all payment providers
 * Automatically selects the configured provider and delegates calls
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly provider: IPaymentProvider;
  private readonly providerType: PaymentProviderType;

  constructor(
    private readonly configService: ConfigService,
    private readonly monnifyProvider: MonnifyProvider,
    private readonly paystackProvider: PaystackProvider,
  ) {
    // Get configured provider from environment
    const configuredProvider = this.configService.get<string>(
      'PAYMENT_PROVIDER',
      PaymentProviderType.PAYSTACK,
    ).toUpperCase();

    this.providerType = configuredProvider as PaymentProviderType;

    // Select provider based on configuration
    switch (this.providerType) {
      case PaymentProviderType.PAYSTACK:
        this.provider = this.paystackProvider;
        this.logger.log('Using Paystack as payment provider');
        break;
      case PaymentProviderType.MONNIFY:
      default:
        this.provider = this.monnifyProvider;
        this.logger.log('Using Monnify as payment provider');
        break;
    }
  }

  /**
   * Get the current active provider
   */
  getActiveProvider(): PaymentProviderType {
    return this.providerType;
  }

  /**
   * Get the provider instance (for advanced use cases)
   */
  getProviderInstance(): IPaymentProvider {
    return this.provider;
  }

  // ============================================================
  // Virtual Wallet/Account Management
  // ============================================================

  /**
   * Create a virtual account/wallet for a customer
   */
  async createVirtualAccount(
    dto: CreateVirtualAccountDto,
  ): Promise<VirtualAccountResponseDto> {
    try {
      this.logger.log(
        `Creating virtual account for ${dto.customerEmail} using ${this.providerType}`,
      );
      return await this.provider.createVirtualAccount(dto);
    } catch (error) {
      this.logger.error('Failed to create virtual account:', error.message);
      throw error;
    }
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(walletReference: string): Promise<WalletBalanceDto> {
    try {
      return await this.provider.getWalletBalance(walletReference);
    } catch (error) {
      this.logger.error('Failed to get wallet balance:', error.message);
      throw error;
    }
  }

  /**
   * Get virtual account details
   */
  async getVirtualAccountDetails(
    walletReference: string,
  ): Promise<VirtualAccountResponseDto> {
    try {
      return await this.provider.getVirtualAccountDetails(walletReference);
    } catch (error) {
      this.logger.error('Failed to get virtual account details:', error.message);
      throw error;
    }
  }

  // ============================================================
  // Payment Processing
  // ============================================================

  /**
   * Initialize a payment transaction
   */
  async initializePayment(
    dto: InitializePaymentRequestDto,
  ): Promise<InitializePaymentResponseDto> {
    try {
      this.logger.log(
        `Initializing payment for ${dto.customerEmail}, amount: ${dto.amount}`,
      );
      return await this.provider.initializePayment(dto);
    } catch (error) {
      this.logger.error('Failed to initialize payment:', error.message);
      throw error;
    }
  }

  /**
   * Verify a payment transaction
   */
  async verifyPayment(
    paymentReference: string,
  ): Promise<VerifyPaymentResponseDto> {
    try {
      this.logger.log(`Verifying payment: ${paymentReference}`);
      return await this.provider.verifyPayment(paymentReference);
    } catch (error) {
      this.logger.error('Failed to verify payment:', error.message);
      throw error;
    }
  }

  // ============================================================
  // Transfers/Disbursements
  // ============================================================

  /**
   * Transfer funds from virtual wallet to bank account
   */
  async transferToBank(dto: TransferRequestDto): Promise<TransferResponseDto> {
    try {
      this.logger.log(
        `Initiating transfer: ${dto.amount} to ${dto.destinationAccountNumber}`,
      );
      return await this.provider.transferToBank(dto);
    } catch (error) {
      this.logger.error('Failed to transfer to bank:', error.message);
      throw error;
    }
  }

  /**
   * Transfer funds between virtual wallets (if supported by provider)
   */
  async transferBetweenWallets(
    dto: TransferRequestDto,
  ): Promise<TransferResponseDto> {
    try {
      if (!this.provider.transferBetweenWallets) {
        throw new InternalServerErrorException(
          `Wallet-to-wallet transfer not supported by ${this.providerType}`,
        );
      }
      return await this.provider.transferBetweenWallets(dto);
    } catch (error) {
      this.logger.error('Failed to transfer between wallets:', error.message);
      throw error;
    }
  }

  // ============================================================
  // Bank Account Management
  // ============================================================

  /**
   * Resolve bank account details
   */
  async resolveBankAccount(
    dto: ResolveBankAccountDto,
  ): Promise<BankAccountDetailsDto> {
    try {
      return await this.provider.resolveBankAccount(dto);
    } catch (error) {
      this.logger.error('Failed to resolve bank account:', error.message);
      throw error;
    }
  }

  /**
   * Get list of supported banks
   */
  async getBankList(): Promise<Array<{ code: string; name: string }>> {
    try {
      return await this.provider.getBankList();
    } catch (error) {
      this.logger.error('Failed to get bank list:', error.message);
      throw error;
    }
  }

  // ============================================================
  // Webhook Processing
  // ============================================================

  /**
   * Process webhook event from provider
   */
  async processWebhook(
    payload: any,
    signature?: string,
  ): Promise<WebhookEventDto> {
    try {
      // Validate signature if provided
      if (signature) {
        const isValid = this.provider.validateWebhookSignature(payload, signature);
        if (!isValid) {
          throw new InternalServerErrorException('Invalid webhook signature');
        }
      }

      return await this.provider.processWebhook(payload, signature);
    } catch (error) {
      this.logger.error('Failed to process webhook:', error.message);
      throw error;
    }
  }

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(payload: any, signature: string): boolean {
    try {
      return this.provider.validateWebhookSignature(payload, signature);
    } catch (error) {
      this.logger.error('Failed to validate webhook signature:', error.message);
      return false;
    }
  }

  // ============================================================
  // Utility Methods
  // ============================================================

  /**
   * Map payment methods to provider-specific format
   */
  getPaymentMethodsForProvider(paymentMethod: string): string[] {
    switch (paymentMethod) {
      case 'CARD':
        return this.providerType === PaymentProviderType.PAYSTACK
          ? ['card']
          : ['CARD'];
      case 'BANK_TRANSFER':
        return this.providerType === PaymentProviderType.PAYSTACK
          ? ['bank_transfer']
          : ['ACCOUNT_TRANSFER'];
      default:
        return this.providerType === PaymentProviderType.PAYSTACK
          ? ['card', 'bank_transfer', 'ussd']
          : ['CARD', 'ACCOUNT_TRANSFER'];
    }
  }

  /**
   * Get access token (if needed by provider)
   */
  async getAccessToken(): Promise<string> {
    if (this.provider.getAccessToken) {
      return await this.provider.getAccessToken();
    }
    throw new InternalServerErrorException(
      'Access token not supported by current provider',
    );
  }


  /**
   * Health check for payment provider
   */
  async healthCheck(): Promise<{
    provider: PaymentProviderType;
    status: 'healthy' | 'unhealthy';
    message?: string;
  }> {
    try {
      // Try to get bank list as a health check
      await this.getBankList();
      return {
        provider: this.providerType,
        status: 'healthy',
      };
    } catch (error) {
      return {
        provider: this.providerType,
        status: 'unhealthy',
        message: error.message,
      };
    }
  }
}