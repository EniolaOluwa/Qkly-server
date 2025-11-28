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
} from '../dto/payment-provider.dto';

export abstract class IPaymentProvider {
  abstract getProviderType(): PaymentProviderType;

  abstract createVirtualAccount(dto: CreateVirtualAccountDto): Promise<VirtualAccountResponseDto>;

  abstract getWalletBalance(walletReference: string): Promise<WalletBalanceDto>;

  abstract getVirtualAccountDetails(walletReference: string): Promise<VirtualAccountResponseDto>;

  abstract initializePayment(
    dto: InitializePaymentRequestDto,
  ): Promise<InitializePaymentResponseDto>;

  abstract verifyPayment(paymentReference: string): Promise<VerifyPaymentResponseDto>;

  abstract transferToBank(dto: TransferRequestDto): Promise<TransferResponseDto>;

  transferBetweenWallets?(dto: TransferRequestDto): Promise<TransferResponseDto>;

  abstract resolveBankAccount(dto: ResolveBankAccountDto): Promise<BankAccountDetailsDto>;

  abstract getBankList(): Promise<Array<{ code: string; name: string }>>;

  abstract processWebhook(payload: any, signature?: string): Promise<WebhookEventDto>;

  abstract validateWebhookSignature(payload: any, signature: string): boolean;

  getAccessToken?(): Promise<string>;
}
