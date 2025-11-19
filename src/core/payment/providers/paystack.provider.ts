// src/core/payment/providers/paystack.provider.ts

import {
  Injectable,
  Logger,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { IPaymentProvider } from '../interfaces/payment-provider.interface';
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
  PaymentVerificationStatus,
  TransferStatus,
} from '../dto/payment-provider.dto';

@Injectable()
export class PaystackProvider extends IPaymentProvider {
  private readonly logger = new Logger(PaystackProvider.name);
  readonly baseUrl: string; // Make public for PaystackIntegrationService
  private readonly secretKey: string;
  private readonly preferredBank: string;

  constructor(
    readonly httpService: HttpService, // Make public for PaystackIntegrationService
    private readonly configService: ConfigService,
  ) {
    super();
    this.baseUrl = this.configService.get<string>(
      'PAYSTACK_BASE_URL',
      'https://api.paystack.co',
    );
    this.secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY', '');
    this.preferredBank = this.configService.get<string>(
      'PAYSTACK_PREFERRED_BANK',
      'test-bank',
    );

    if (!this.secretKey) {
      throw new InternalServerErrorException('Paystack secret key not configured');
    }
  }

  getProviderType(): PaymentProviderType {
    return PaymentProviderType.PAYSTACK;
  }

  // Make public for PaystackIntegrationService
  getHeaders() {
    return {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json',
    };
  }

  // ============================================================
  // VIRTUAL ACCOUNT MANAGEMENT
  // ============================================================

  async createVirtualAccount(dto: CreateVirtualAccountDto): Promise<VirtualAccountResponseDto> {
    try {
      const payload = {
        email: dto.customerEmail,
        first_name: dto.firstName || dto.customerName.split(' ')[0],
        last_name: dto.lastName || dto.customerName.split(' ').slice(1).join(' '),
        phone: dto.phoneNumber,
        preferred_bank: this.preferredBank,
        country: 'NG',
      };


      console.log({ payload })


      this.logger.log(`Creating Paystack DVA for ${dto.customerEmail}`);

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/dedicated_account`, payload, {
          headers: this.getHeaders(),
        }),
      ).catch((error) => {
        // Handle customer already exists
        if (
          error.response?.data?.message?.toLowerCase().includes('already') ||
          error.response?.data?.message?.toLowerCase().includes('customer')
        ) {
          this.logger.warn(`Customer ${dto.customerEmail} exists, will fetch DVA`);
          throw new BadRequestException('CUSTOMER_EXISTS');
        }
        throw error;
      });

      return this.handleDVAResponse(response, dto);
    } catch (error) {
      // If customer exists, fetch their existing DVA
      if (error.message === 'CUSTOMER_EXISTS') {
        return await this.fetchExistingCustomerDVA(dto.customerEmail ?? dto.email);
      }

      this.logger.error('DVA creation failed:', error);
      throw new InternalServerErrorException('Failed to create virtual account');
    }
  }

  /**
   * Fetch existing customer's DVA
   */
  private async fetchExistingCustomerDVA(email: string): Promise<VirtualAccountResponseDto> {
    try {
      // Step 1: Fetch customer by email
      const customerResponse = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/customer/${encodeURIComponent(email)}`, {
          headers: this.getHeaders(),
        }),
      );

      const customer = customerResponse.data.data;
      const customerCode = customer.customer_code;

      if (!customerCode) {
        throw new Error('Customer code not found');
      }

      // Step 2: Fetch customer's dedicated accounts
      const dvaResponse = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/dedicated_account?customer=${customerCode}`, {
          headers: this.getHeaders(),
        }),
      );

      const accounts = dvaResponse.data.data;

      if (!accounts || accounts.length === 0) {
        throw new Error('No dedicated accounts found');
      }

      // Get the first active account
      const activeAccount = accounts.find((acc: any) => acc.active) || accounts[0];

      return {
        walletReference: customer.id.toString(),
        accountNumber: activeAccount.account_number || 'PENDING',
        accountName: activeAccount.account_name,
        bankName: activeAccount.bank?.name || 'Unknown',
        bankCode: activeAccount.bank?.code || activeAccount.bank?.id?.toString() || '',
        currencyCode: activeAccount.currency || 'NGN',
        createdOn: activeAccount.created_at,
        provider: PaymentProviderType.PAYSTACK,
        providerAccountId: activeAccount.id?.toString(),
        customerCode: customerCode,
        status: activeAccount.active ? 'ACTIVE' : 'PENDING',
      };
    } catch (error) {
      this.logger.error('Error fetching existing DVA:', error);
      throw new InternalServerErrorException('Failed to fetch existing account');
    }
  }

  /**
   * Handle DVA creation response
   */
  private handleDVAResponse(response: any, dto: CreateVirtualAccountDto): VirtualAccountResponseDto {
    const data = response.data.data;

    // Check if DVA is pending
    if (
      response.data.message === 'Assign dedicated account in progress' ||
      !data.account_number
    ) {
      this.logger.warn('Paystack DVA creation in progress');

      return {
        walletReference: dto.walletReference,
        accountNumber: 'PENDING',
        accountName: `${dto.firstName} ${dto.lastName}`,
        bankName: data.bank?.name || 'Pending',
        bankCode: data.bank?.code || data.bank?.id?.toString() || '',
        currencyCode: data.currency || 'NGN',
        createdOn: new Date().toISOString(),
        provider: PaymentProviderType.PAYSTACK,
        providerAccountId: data.id?.toString() || 'PENDING',
        customerCode: data.customer_code,
        status: 'PENDING',
      };
    }

    // DVA created successfully
    return {
      walletReference: dto.walletReference,
      accountNumber: data.account_number,
      accountName: data.account_name,
      bankName: data.bank.name,
      bankCode: data.bank.code || data.bank.id.toString(),
      currencyCode: data.currency,
      createdOn: data.created_at,
      provider: PaymentProviderType.PAYSTACK,
      providerAccountId: data.id.toString(),
      customerCode: data.customer_code,
      status: 'ACTIVE',
    };
  }

  async getVirtualAccountDetails(customerCode: string): Promise<VirtualAccountResponseDto> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/dedicated_account?customer=${customerCode}`, {
          headers: this.getHeaders(),
        }),
      );

      const accounts = response.data.data;

      if (!accounts || accounts.length === 0) {
        throw new BadRequestException('No virtual account found');
      }

      const account = accounts[0];

      return {
        walletReference: customerCode,
        accountNumber: account.account_number,
        accountName: account.account_name,
        bankName: account.bank.name,
        bankCode: account.bank.code || account.bank.id.toString(),
        currencyCode: account.currency,
        createdOn: account.created_at,
        provider: PaymentProviderType.PAYSTACK,
        providerAccountId: account.id.toString(),
        customerCode: customerCode,
        status: account.active ? 'ACTIVE' : 'INACTIVE',
      };
    } catch (error) {
      this.logger.error('Failed to fetch virtual account:', error);
      throw new InternalServerErrorException('Failed to fetch account details');
    }
  }

  async getWalletBalance(walletReference: string): Promise<WalletBalanceDto> {
    // Note: Paystack doesn't provide individual DVA balances
    // You must track this in your database via transactions
    throw new InternalServerErrorException(
      'Wallet balance must be calculated from transaction history in your database',
    );
  }

  // ============================================================
  // PAYMENT INITIALIZATION & VERIFICATION
  // ============================================================

  async initializePayment(dto: InitializePaymentRequestDto): Promise<InitializePaymentResponseDto> {
    try {
      const payload: any = {
        email: dto.customerEmail,
        amount: Math.round(dto.amount * 100), // Convert to kobo
        reference: dto.paymentReference,
        callback_url: dto.redirectUrl,
        metadata: dto.metadata,
        channels: this.mapPaymentMethods(dto.paymentMethods),
      };

      // Add subaccount split if provided
      if (dto.subaccount) {
        payload.subaccount = dto.subaccount;
        payload.transaction_charge = dto.transaction_charge || 0;
        payload.bearer = dto.bearer || 'account';
      }

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/transaction/initialize`, payload, {
          headers: this.getHeaders(),
        }),
      );

      const data = response.data.data;

      return {
        authorizationUrl: data.authorization_url,
        accessCode: data.access_code,
        paymentReference: data.reference,
        provider: PaymentProviderType.PAYSTACK,
      };
    } catch (error) {
      this.logger.error('Payment initialization failed:', error);
      throw new InternalServerErrorException('Failed to initialize payment');
    }
  }

  async verifyPayment(paymentReference: string): Promise<VerifyPaymentResponseDto> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/transaction/verify/${paymentReference}`, {
          headers: this.getHeaders(),
        }),
      );

      const transaction = response.data.data;

      return {
        paymentReference: transaction.reference,
        transactionReference: transaction.id.toString(),
        amount: transaction.amount / 100,
        amountPaid: transaction.amount / 100,
        customerName: `${transaction.customer.first_name} ${transaction.customer.last_name}`,
        customerEmail: transaction.customer.email,
        paymentStatus: this.mapPaystackStatus(transaction.status),
        paymentMethod: transaction.channel,
        paidOn: transaction.paid_at || transaction.created_at,
        currency: transaction.currency,
        metadata: transaction.metadata,
        provider: PaymentProviderType.PAYSTACK,
      };
    } catch (error) {
      this.logger.error('Payment verification failed:', error);
      throw new InternalServerErrorException('Failed to verify payment');
    }
  }

  // ============================================================
  // TRANSFERS
  // ============================================================

  async transferToBank(dto: TransferRequestDto): Promise<TransferResponseDto> {
    try {
      // Step 1: Create or get transfer recipient
      const recipient = await this.createOrGetTransferRecipient({
        type: 'nuban',
        name: dto.destinationAccountName || 'Beneficiary',
        account_number: dto.destinationAccountNumber,
        bank_code: dto.destinationBankCode,
        currency: dto.currency || 'NGN',
      });

      // Step 2: Initiate transfer
      const transferPayload = {
        source: 'balance',
        amount: Math.round(dto.amount * 100), // Convert to kobo
        reference: dto.reference,
        recipient: recipient.recipient_code,
        reason: dto.narration,
      };

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/transfer`, transferPayload, {
          headers: this.getHeaders(),
        }),
      );

      const data = response.data.data;

      return {
        transferReference: data.reference || dto.reference,
        amount: data.amount / 100,
        status: this.mapTransferStatus(data.status),
        recipientAccountNumber: dto.destinationAccountNumber,
        recipientBankCode: dto.destinationBankCode,
        narration: dto.narration,
        dateInitiated: data.created_at || new Date().toISOString(),
        provider: PaymentProviderType.PAYSTACK,
        providerResponse: data,
      };
    } catch (error) {
      this.logger.error('Transfer failed:', error);
      throw new InternalServerErrorException('Failed to process transfer');
    }
  }

  private async createOrGetTransferRecipient(recipientData: {
    type: string;
    name: string;
    account_number: string;
    bank_code: string;
    currency: string;
  }): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/transferrecipient`, recipientData, {
          headers: this.getHeaders(),
        }),
      );

      return response.data.data;
    } catch (error) {
      // Paystack returns existing recipient if duplicate
      if (error.response?.data?.status && error.response?.data?.data) {
        this.logger.log('Using existing transfer recipient');
        return error.response.data.data;
      }

      this.logger.error('Failed to create recipient:', error);
      throw new InternalServerErrorException('Failed to create transfer recipient');
    }
  }

  // ============================================================
  // REFUNDS
  // ============================================================

  async createRefund(params: {
    transactionReference: string;
    amount?: number;
    merchantNote?: string;
    customerNote?: string;
  }): Promise<{
    status: string;
    message: string;
    refundReference: string;
    amount: number;
  }> {
    try {
      const payload: any = {
        transaction: params.transactionReference,
      };

      if (params.amount) {
        payload.amount = Math.round(params.amount * 100); // Convert to kobo
      }

      if (params.merchantNote) {
        payload.merchant_note = params.merchantNote;
      }

      if (params.customerNote) {
        payload.customer_note = params.customerNote;
      }

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/refund`, payload, {
          headers: this.getHeaders(),
        }),
      );

      const data = response.data.data;

      return {
        status: data.status,
        message: response.data.message,
        refundReference: data.transaction.reference,
        amount: data.transaction.amount / 100,
      };
    } catch (error) {
      this.logger.error('Refund failed:', error);
      throw new InternalServerErrorException('Failed to process refund');
    }
  }

  // ============================================================
  // BANK OPERATIONS
  // ============================================================

  async resolveBankAccount(dto: ResolveBankAccountDto): Promise<BankAccountDetailsDto> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/bank/resolve?account_number=${dto.accountNumber}&bank_code=${dto.bankCode}`,
          { headers: this.getHeaders() },
        ),
      );

      const data = response.data.data;

      return {
        accountNumber: data.account_number,
        accountName: data.account_name,
        bankCode: dto.bankCode,
      };
    } catch (error) {
      this.logger.error('Bank account resolution failed:', error);
      throw new BadRequestException('Failed to resolve bank account');
    }
  }

  async getBankList(): Promise<Array<{ code: string; name: string }>> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/bank`, {
          headers: this.getHeaders(),
          params: { currency: 'NGN', perPage: 100 },
        }),
      );

      return response.data.data.map((bank: any) => ({
        code: bank.code,
        name: bank.name,
      }));
    } catch (error) {
      this.logger.error('Failed to get bank list:', error);
      throw new InternalServerErrorException('Failed to get bank list');
    }
  }

  // ============================================================
  // WEBHOOK PROCESSING
  // ============================================================

  async processWebhook(payload: any, signature?: string): Promise<WebhookEventDto> {
    try {
      const event = payload.event;
      const data = payload.data;

      let eventType = 'TRANSACTION';

      if (event === 'charge.success') {
        eventType = 'SUCCESSFUL_TRANSACTION';
      } else if (event === 'transfer.success') {
        eventType = 'SUCCESSFUL_TRANSFER';
      } else if (event === 'transfer.failed') {
        eventType = 'FAILED_TRANSFER';
      }

      return {
        eventType,
        eventData: {
          transactionReference: data.id?.toString() || '',
          paymentReference: data.reference,
          amount: data.amount / 100,
          amountPaid: data.amount / 100,
          customerName: `${data.customer?.first_name || ''} ${data.customer?.last_name || ''}`.trim(),
          customerEmail: data.customer?.email || '',
          paymentStatus: data.status,
          paymentMethod: data.channel || data.authorization?.channel || 'unknown',
          paidOn: data.paid_at || data.created_at,
          currency: data.currency,
          metadata: data.metadata,
        },
        provider: PaymentProviderType.PAYSTACK,
      };
    } catch (error) {
      this.logger.error('Webhook processing failed:', error);
      throw error;
    }
  }

  validateWebhookSignature(payload: any, signature: string): boolean {
    try {
      const hash = crypto
        .createHmac('sha512', this.secretKey)
        .update(JSON.stringify(payload))
        .digest('hex');

      return hash === signature;
    } catch (error) {
      this.logger.error('Webhook signature validation failed:', error);
      return false;
    }
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  private mapPaystackStatus(status: string): PaymentVerificationStatus {
    switch (status.toLowerCase()) {
      case 'success':
        return PaymentVerificationStatus.SUCCESS;
      case 'pending':
        return PaymentVerificationStatus.PENDING;
      case 'failed':
        return PaymentVerificationStatus.FAILED;
      case 'abandoned':
        return PaymentVerificationStatus.ABANDONED;
      case 'reversed':
        return PaymentVerificationStatus.REVERSED;
      default:
        return PaymentVerificationStatus.PENDING;
    }
  }

  private mapTransferStatus(status: string): TransferStatus {
    switch (status.toLowerCase()) {
      case 'success':
        return TransferStatus.SUCCESS;
      case 'pending':
        return TransferStatus.PENDING;
      case 'failed':
        return TransferStatus.FAILED;
      case 'reversed':
        return TransferStatus.REVERSED;
      default:
        return TransferStatus.PENDING;
    }
  }

  private mapPaymentMethods(methods?: string[]): string[] {
    if (!methods || methods.length === 0) {
      return ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'];
    }

    const methodMap: Record<string, string> = {
      CARD: 'card',
      BANK_TRANSFER: 'bank_transfer',
      ACCOUNT_TRANSFER: 'bank_transfer',
      USSD: 'ussd',
      QR: 'qr',
      MOBILE_MONEY: 'mobile_money',
    };

    return methods.map((m) => methodMap[m.toUpperCase()] || m.toLowerCase());
  }
}