// src/modules/payments/payment.service.ts

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorHelper } from '../../common/utils';
import { OrderService } from '../order/order.service';
import {
  BankAccountDetailsDto,
  CreateVirtualAccountDto,
  InitializePaymentRequestDto,
  InitializePaymentResponseDto,
  PaymentProviderType,
  ResolveBankAccountDto,
  TransferRequestDto,
  TransferResponseDto,
  VerifyPaymentResponseDto,
  VirtualAccountResponseDto,
  WalletBalanceDto,
  WebhookEventDto,
  RefundRequestDto,
  RefundResponseDto,
} from './dto/payment-provider.dto';
import { IPaymentProvider } from './interfaces/payment-provider.interface';
import { PaystackProvider } from './providers/paystack.provider';

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
    private readonly paystackProvider: PaystackProvider,
    @Inject(forwardRef(() => OrderService))
    private readonly orderService: OrderService,
  ) {
    // Get configured provider from environment
    const configuredProvider = this.configService.get<string>(
      'PAYMENT_PROVIDER',
      PaymentProviderType.PAYSTACK,
    ).toUpperCase();

    this.providerType = configuredProvider as PaymentProviderType;

    // Select provider based on configuration
    // Only Paystack is supported
    this.provider = this.paystackProvider;
    this.logger.log('Using Paystack as payment provider');
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
      // We need to cast or ensure provider has createVirtualAccount accepting subaccount
      // Since we updated provider, it handles it, but interface might limit us.
      // Dto now has subaccount. Passing it through.
      return await this.provider.createVirtualAccount(dto);
    } catch (error) {
      this.logger.error('Failed to create virtual account:', error.message);
      throw error;
    }
  }

  async fetchSubaccount(subaccountCode: string): Promise<any> {
    if (this.providerType === PaymentProviderType.PAYSTACK) {
      return (this.provider as any).fetchSubaccount(subaccountCode);
    }
    throw new Error('Provider does not support subaccount fetching');
  }

  /**
   * Create a subaccount (Delegates to provider)
   */
  async requestPayout(subaccountCode: string, amount: number, bankDetails: any): Promise<any> {
    if (this.providerType === PaymentProviderType.PAYSTACK) {
      return (this.provider as any).requestPayout(subaccountCode, amount, bankDetails);
    }
    throw new Error('Provider does not support payouts');
  }

  async createSubaccount(payload: any): Promise<any> {
    // Check if provider supports it
    if (this.providerType === PaymentProviderType.PAYSTACK && 'createSubaccount' in this.provider) {
      return await (this.provider as any).createSubaccount(payload);
    }
    throw new Error(`Provider ${this.providerType} does not support subaccount creation`);
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
        ErrorHelper.InternalServerErrorException(
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
    rawBody?: string,
  ): Promise<WebhookEventDto> {
    try {
      // Validate signature if provided
      if (signature && rawBody) {
        const isValid = this.provider.validateWebhookSignature(rawBody, signature);
        if (!isValid) {
          ErrorHelper.InternalServerErrorException('Invalid webhook signature');
        }
      }

      const event = await this.provider.processWebhook(payload, signature);

      // Forward to OrderService for processing
      await this.orderService.processWebhook(event);

      return event;
    } catch (error) {
      this.logger.error('Failed to process webhook:', error.message);
      throw error;
    }
  }

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(rawBody: string, signature: string): boolean {
    try {
      return this.provider.validateWebhookSignature(rawBody, signature);
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
    ErrorHelper.InternalServerErrorException(
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
  // Create Refund
  async createRefund(dto: RefundRequestDto): Promise<RefundResponseDto> {
    return this.provider.createRefund(dto);
  }
}