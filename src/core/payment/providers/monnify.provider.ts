import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom } from 'rxjs';
import { MonnifyAuthResponseBody, MonnifyAxiosError, MonnifyPaymentInitResponseBody, MonnifySuccessResponse, MonnifyTransactionResponseBody } from '../../../common/interfaces/monnify-response.interface';
import { ErrorHelper } from '../../../common/utils';
import { verifyMonnifySignature } from '../../../common/utils/webhook.utils';
import {
  BankAccountDetailsDto,
  CreateVirtualAccountDto,
  InitializePaymentRequestDto,
  InitializePaymentResponseDto,
  PaymentProviderType,
  PaymentVerificationStatus,
  ResolveBankAccountDto,
  TransferRequestDto,
  TransferResponseDto,
  TransferStatus,
  VerifyPaymentResponseDto,
  VirtualAccountResponseDto,
  WalletBalanceDto,
  WebhookEventDto,
} from '../dto/payment-provider.dto';
import { IPaymentProvider } from '../interfaces/payment-provider.interface';


@Injectable()
export class MonnifyProvider extends IPaymentProvider {
  private readonly logger = new Logger(MonnifyProvider.name);
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  getProviderType(): PaymentProviderType {
    return PaymentProviderType.MONNIFY;
  }

  async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const monnifyBaseUrl = this.configService.get<string>(
        'MONNIFY_BASE_URL',
        'https://sandbox.monnify.com',
      );
      const monnifyApiKey = this.configService.get<string>('MONNIFY_API_KEY');
      const monnifySecretKey = this.configService.get<string>('MONNIFY_SECRET_KEY');

      if (!monnifyApiKey || !monnifySecretKey) {
        ErrorHelper.InternalServerErrorException(
          'Monnify API credentials not configured',
        );
      }

      const credentials = Buffer.from(
        `${monnifyApiKey}:${monnifySecretKey}`,
      ).toString('base64');

      const response = await firstValueFrom(
        this.httpService
          .post<MonnifySuccessResponse<MonnifyAuthResponseBody>>(
            `${monnifyBaseUrl}/api/v1/auth/login`,
            {},
            {
              headers: {
                Authorization: `Basic ${credentials}`,
                'Content-Type': 'application/json',
              },
            },
          )
          .pipe(
            catchError((error: MonnifyAxiosError) => {
              this.logger.error(
                'Monnify authentication failed:',
                error.response?.data || error.message,
              );
              ErrorHelper.InternalServerErrorException(
                `Failed to authenticate with Monnify: ${error.response?.data?.responseMessage || error.message}`,
              );
            }),
          ),
      );

      if (
        response.data.requestSuccessful &&
        response.data.responseBody?.accessToken
      ) {
        this.accessToken = response.data.responseBody.accessToken;
        // Set token expiry to 50 minutes (Monnify tokens expire in 1 hour)
        this.tokenExpiry = new Date(Date.now() + 50 * 60 * 1000);
        return this.accessToken;
      }

      ErrorHelper.InternalServerErrorException('Failed to get access token from Monnify');
    } catch (error) {
      this.logger.error(
        'Monnify authentication failed:',
        error.response?.data || error.message,
      );
      ErrorHelper.InternalServerErrorException(
        'Failed to authenticate with Monnify',
      );
    }
  }


  async createVirtualAccount(
    dto: CreateVirtualAccountDto,
  ): Promise<VirtualAccountResponseDto> {
    try {
      const accessToken = await this.getAccessToken();
      const monnifyBaseUrl = this.configService.get<string>(
        'MONNIFY_BASE_URL',
        'https://sandbox.monnify.com',
      );

      const payload = {
        walletReference: dto.walletReference,
        walletName: dto.walletName,
        customerEmail: dto.customerEmail,
        customerName: dto.customerName,
        bvnDetails: {
          bvn: dto.bvn,
          bvnDateOfBirth: dto.dateOfBirth,
        },
      };

      const response = await firstValueFrom(
        this.httpService
          .post(`${monnifyBaseUrl}/api/v1/disbursements/wallet`, payload, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          })
          .pipe(
            catchError((error: MonnifyAxiosError) => {
              this.logger.error(
                `Failed to create wallet: ${JSON.stringify(error.response?.data)}`,
              );
              ErrorHelper.InternalServerErrorException(
                `Failed to create wallet: ${error.response?.data?.responseMessage || error.message}`,
              );
            }),
          ),
      );

      const walletResponse = response.data;

      if (!walletResponse.requestSuccessful) {
        ErrorHelper.InternalServerErrorException(
          walletResponse.responseMessage || 'Wallet creation failed',
        );
      }

      const walletDetails = walletResponse.responseBody;

      return {
        walletReference: walletDetails.walletReference || dto.walletReference,
        accountNumber: walletDetails.accountNumber,
        accountName: walletDetails.accountName || dto.walletName,
        bankName:
          walletDetails.bankName || walletDetails.topUpAccountDetails?.bankName,
        bankCode:
          walletDetails.bankCode || walletDetails.topUpAccountDetails?.bankCode,
        currencyCode: walletDetails.currencyCode || dto.currencyCode || 'NGN',
        createdOn: walletDetails.createdOn || new Date().toISOString(),
        provider: PaymentProviderType.MONNIFY,
      };
    } catch (error) {
      this.logger.error('Monnify wallet creation failed:', error.message);
      throw error;
    }
  }

  async getWalletBalance(walletReference: string): Promise<WalletBalanceDto> {
    try {
      const accessToken = await this.getAccessToken();
      const monnifyBaseUrl = this.configService.get<string>(
        'MONNIFY_BASE_URL',
        'https://sandbox.monnify.com',
      );

      const response = await firstValueFrom(
        this.httpService
          .get(`${monnifyBaseUrl}/api/v1/disbursements/wallet/balance`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            params: { walletReference },
          })
          .pipe(
            catchError((error) => {
              this.logger.error(
                `Failed to fetch wallet balance: ${JSON.stringify(error.response?.data || error.message)}`,
              );
              ErrorHelper.InternalServerErrorException(
                error.response?.data?.responseMessage ||
                'Failed to fetch wallet balance',
              );
            }),
          ),
      );

      const balanceResponse = response.data;

      if (!balanceResponse.requestSuccessful) {
        ErrorHelper.InternalServerErrorException(
          balanceResponse.responseMessage || 'Failed to fetch wallet balance',
        );
      }

      return {
        availableBalance: balanceResponse.responseBody.availableBalance,
        ledgerBalance: balanceResponse.responseBody.ledgerBalance,
        currencyCode: 'NGN',
      };
    } catch (error) {
      this.logger.error('Failed to get wallet balance:', error.message);
      throw error;
    }
  }

  async getVirtualAccountDetails(
    walletReference: string,
  ): Promise<VirtualAccountResponseDto> {
    // Monnify doesn't have a direct endpoint for this
    // We'll need to fetch from database or return basic info
    ErrorHelper.UnprocessableEntityException('Method not directly supported by Monnify');
  }


  async initializePayment(
    dto: InitializePaymentRequestDto,
  ): Promise<InitializePaymentResponseDto> {
    try {
      const accessToken = await this.getAccessToken();
      const monnifyBaseUrl = this.configService.get<string>(
        'MONNIFY_BASE_URL',
        'https://sandbox.monnify.com',
      );
      const monnifyContractCode = this.configService.get<string>(
        'MONNIFY_CONTRACT_CODE',
      );

      const payload = {
        amount: Number(dto.amount),
        customerName: dto.customerName,
        customerEmail: dto.customerEmail,
        paymentReference: dto.paymentReference,
        paymentDescription: dto.description,
        currencyCode: dto.currencyCode || 'NGN',
        contractCode: monnifyContractCode,
        redirectUrl: dto.redirectUrl,
        paymentMethods: dto.paymentMethods || ['CARD', 'ACCOUNT_TRANSFER'],
        metadata: dto.metadata,
      };

      const response = await firstValueFrom(
        this.httpService
          .post<MonnifySuccessResponse<MonnifyPaymentInitResponseBody>>(
            `${monnifyBaseUrl}/api/v1/merchant/transactions/init-transaction`,
            payload,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            },
          )
          .pipe(
            catchError((error: MonnifyAxiosError) => {
              this.logger.error(
                `Monnify payment initialization failed: ${JSON.stringify(error.response?.data)}`,
              );
              ErrorHelper.InternalServerErrorException(
                `Failed to initialize payment: ${error.response?.data?.responseMessage || error.message}`,
              );
            }),
          ),
      );

      const paymentResponse = response.data;

      if (!paymentResponse.requestSuccessful) {
        ErrorHelper.InternalServerErrorException(
          paymentResponse.responseMessage || 'Payment initialization failed',
        );
      }

      return {
        authorizationUrl: paymentResponse.responseBody.checkoutUrl,
        accessCode: paymentResponse.responseBody.transactionReference ?? '',
        paymentReference: dto.paymentReference,
        provider: PaymentProviderType.MONNIFY,
        expiresAt: paymentResponse.responseBody.expiresAt,
      };
    } catch (error) {
      this.logger.error('Payment initialization failed:', error.message);
      throw error;
    }
  }

  async verifyPayment(
    paymentReference: string,
  ): Promise<VerifyPaymentResponseDto> {
    try {
      const accessToken = await this.getAccessToken();
      const monnifyBaseUrl = this.configService.get<string>(
        'MONNIFY_BASE_URL',
        'https://sandbox.monnify.com',
      );

      const response = await firstValueFrom(
        this.httpService
          .get<MonnifySuccessResponse<MonnifyTransactionResponseBody>>(
            `${monnifyBaseUrl}/api/v1/merchant/transactions/query?paymentReference=${paymentReference}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            },
          )
          .pipe(
            catchError((error: MonnifyAxiosError) => {
              this.logger.error(
                `Monnify payment verification failed: ${JSON.stringify(error.response?.data)}`,
              );
              ErrorHelper.InternalServerErrorException(
                `Failed to verify payment: ${error.response?.data?.responseMessage || error.message}`,
              );
            }),
          ),
      );

      const verificationResponse = response.data;

      if (!verificationResponse.requestSuccessful) {
        ErrorHelper.InternalServerErrorException(
          verificationResponse.responseMessage || 'Payment verification failed',
        );
      }

      const transaction = verificationResponse.responseBody;

      return {
        paymentReference: transaction.paymentReference,
        transactionReference: transaction.transactionReference,
        amount: transaction.amount,
        amountPaid: transaction.amount,
        customerName: transaction.customerName,
        customerEmail: transaction.customerEmail,
        paymentStatus: this.mapMonnifyStatus(transaction.paymentStatus),
        paymentMethod: transaction.paymentMethod,
        paidOn: transaction.createdOn,
        currency: 'NGN',
        metadata: transaction.meta,
        provider: PaymentProviderType.MONNIFY,
      };
    } catch (error) {
      this.logger.error('Payment verification failed:', error.message);
      throw error;
    }
  }


  async transferToBank(dto: TransferRequestDto): Promise<TransferResponseDto> {
    try {
      const accessToken = await this.getAccessToken();
      const monnifyBaseUrl = this.configService.get<string>(
        'MONNIFY_BASE_URL',
        'https://sandbox.monnify.com',
      );

      const sourceAccountNumber =
        dto.sourceWalletReference ||
        this.configService.get<string>('MONNIFY_WALLET_ACCOUNT');

      const transferPayload = {
        amount: dto.amount,
        reference: dto.reference,
        narration: dto.narration,
        destinationAccountNumber: dto.destinationAccountNumber,
        destinationBankCode: dto.destinationBankCode,
        currency: dto.currency || 'NGN',
        sourceAccountNumber,
        async: false,
      };

      const response = await firstValueFrom(
        this.httpService
          .post(
            `${monnifyBaseUrl}/api/v2/disbursements/single`,
            transferPayload,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            },
          )
          .pipe(
            catchError((error) => {
              this.logger.error(
                `Transfer failed: ${JSON.stringify(error.response?.data || error.message)}`,
              );
              ErrorHelper.InternalServerErrorException(
                error.response?.data?.responseMessage || 'Transfer failed',
              );
            }),
          ),
      );

      const transferResponse = response.data;

      const status = transferResponse.requestSuccessful
        ? TransferStatus.SUCCESS
        : TransferStatus.FAILED;

      return {
        transferReference: dto.reference,
        amount: dto.amount,
        status,
        recipientAccountNumber: dto.destinationAccountNumber,
        recipientBankCode: dto.destinationBankCode,
        narration: dto.narration,
        dateInitiated: new Date().toISOString(),
        provider: PaymentProviderType.MONNIFY,
        providerResponse: transferResponse.responseBody,
      };
    } catch (error) {
      this.logger.error('Transfer to bank failed:', error.message);
      throw error;
    }
  }

  /**
   * Transfer between wallets - Monnify supports this
   */
  async transferBetweenWallets(
    dto: TransferRequestDto,
  ): Promise<TransferResponseDto> {
    // Monnify supports wallet-to-wallet transfers
    // Implementation is similar to transferToBank but both source and destination are Monnify wallets
    return this.transferToBank(dto);
  }

  // ============================================================
  // Bank Account Management
  // ============================================================

  async resolveBankAccount(
    dto: ResolveBankAccountDto,
  ): Promise<BankAccountDetailsDto> {
    try {
      const accessToken = await this.getAccessToken();
      const monnifyBaseUrl = this.configService.get<string>(
        'MONNIFY_BASE_URL',
        'https://sandbox.monnify.com',
      );

      const response = await firstValueFrom(
        this.httpService.get(
          `${monnifyBaseUrl}/api/v1/disbursements/account/validate`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            params: {
              accountNumber: dto.accountNumber,
              bankCode: dto.bankCode,
            },
          },
        ),
      );

      const data = response.data.responseBody;

      return {
        accountNumber: dto.accountNumber,
        accountName: data.accountName,
        bankCode: dto.bankCode,
        bankName: data.bankName,
      };
    } catch (error) {
      this.logger.error('Bank account resolution failed:', error.message);
      ErrorHelper.InternalServerErrorException(
        'Failed to resolve bank account',
      );
    }
  }

  async getBankList(): Promise<Array<{ code: string; name: string }>> {
    try {
      const accessToken = await this.getAccessToken();
      const monnifyBaseUrl = this.configService.get<string>(
        'MONNIFY_BASE_URL',
        'https://sandbox.monnify.com',
      );

      const response = await firstValueFrom(
        this.httpService.get(`${monnifyBaseUrl}/api/v1/banks`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      );

      return response.data.responseBody.map((bank: any) => ({
        code: bank.code,
        name: bank.name,
      }));
    } catch (error) {
      this.logger.error('Failed to get bank list:', error.message);
      ErrorHelper.InternalServerErrorException('Failed to get bank list');
    }
  }

  // ============================================================
  // Webhook Processing
  // ============================================================

  async processWebhook(
    payload: any,
    signature?: string,
  ): Promise<WebhookEventDto> {
    try {
      const eventData = payload.eventData;

      return {
        eventType: payload.eventType,
        eventData: {
          transactionReference: eventData.transactionReference,
          paymentReference: eventData.paymentReference,
          amount: eventData.totalPayment || eventData.amountPaid,
          amountPaid: eventData.amountPaid,
          customerName: eventData.customer?.name || '',
          customerEmail: eventData.customer?.email || '',
          paymentStatus: eventData.paymentStatus,
          paymentMethod: eventData.paymentMethod,
          paidOn: eventData.paidOn,
          currency: 'NGN',
          metadata: eventData.metaData,
        },
        provider: PaymentProviderType.MONNIFY,
      };
    } catch (error) {
      this.logger.error('Webhook processing failed:', error.message);
      throw error;
    }
  }




  validateWebhookSignature(payload: any, signature: string): boolean {
    const clientSecret = this.configService.get<string>('MONNIFY_SECRET_KEY', '');
    return verifyMonnifySignature(signature, payload, clientSecret)
  }

  // ============================================================
  // Helper Methods
  // ============================================================

  private mapMonnifyStatus(status: string): PaymentVerificationStatus {
    const statusUpper = status.toUpperCase();
    switch (statusUpper) {
      case 'PAID':
        return PaymentVerificationStatus.SUCCESS;
      case 'PENDING':
        return PaymentVerificationStatus.PENDING;
      case 'FAILED':
      case 'DECLINED':
        return PaymentVerificationStatus.FAILED;
      case 'EXPIRED':
      case 'ABANDONED':
        return PaymentVerificationStatus.ABANDONED;
      case 'REVERSED':
        return PaymentVerificationStatus.REVERSED;
      default:
        return PaymentVerificationStatus.PENDING;
    }
  }
}
