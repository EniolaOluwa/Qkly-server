import { IsString, IsEmail, IsOptional } from "class-validator";

export enum PaymentProviderType {
  PAYSTACK = 'PAYSTACK',
}

// src/core/payment/dto/payment-provider.dto.ts

export class CreateVirtualAccountDto {
  @IsString()
  walletReference: string;

  @IsEmail()
  customerEmail: string;

  @IsString()
  customerName: string;

  // Make these optional since Paystack doesn't need them
  @IsOptional()
  @IsString()
  walletName?: string;

  @IsOptional()
  @IsString()
  bvn?: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  currencyCode?: string;

  @IsOptional()
  @IsString()
  customerPhoneNumber?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  email?: string;
}

export interface VirtualAccountResponseDto {
  walletReference: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode: string;
  currencyCode: string;
  createdOn: string;
  provider: PaymentProviderType;
  providerAccountId?: string;

  customerCode?: string;  // For Paystack
  status?: string;        // PENDING | ACTIVE
}

export interface WalletBalanceDto {
  availableBalance: number;
  ledgerBalance: number;
  currencyCode: string;
}


export interface InitializePaymentRequestDto {
  amount: number;
  customerName: string;
  customerEmail: string;
  paymentReference: string;
  description: string;
  currencyCode?: string;
  redirectUrl: string;
  paymentMethods?: string[];
  metadata?: Record<string, any>;
  split?: PaymentSplitConfig;
  subaccount?: string; // Paystack subaccount code
  transaction_charge?: number; // Platform fee in kobo
  bearer?: 'account' | 'subaccount' | 'all-proportional' | 'all'; // Who bears Paystack fee
}

export interface PaymentSplitConfig {
  type: 'flat' | 'percentage';
  subaccountCode?: string; // For Paystack
  walletReference?: string; // For Monnify
  bearerType: 'account' | 'subaccount' | 'all-proportional' | 'all';
  percentage?: number;
  flatAmount?: number;
}

export interface InitializePaymentResponseDto {
  authorizationUrl: string;
  accessCode: string;
  paymentReference: string;
  provider: PaymentProviderType;
  expiresAt?: string;
}


export interface VerifyPaymentResponseDto {
  paymentReference: string;
  transactionReference: string;
  amount: number;
  amountPaid: number;
  customerName: string;
  customerEmail: string;
  paymentStatus: PaymentVerificationStatus;
  paymentMethod: string;
  paidOn: string;
  currency: string;
  metadata?: Record<string, any>;
  provider: PaymentProviderType;
}

export enum PaymentVerificationStatus {
  SUCCESS = 'SUCCESS',
  PENDING = 'PENDING',
  FAILED = 'FAILED',
  ABANDONED = 'ABANDONED',
  REVERSED = 'REVERSED',
}


export interface TransferRequestDto {
  amount: number;
  reference: string;
  narration: string;
  destinationAccountNumber: string;
  destinationBankCode: string;
  destinationAccountName?: string;
  currency?: string;
  sourceWalletReference?: string; // Source virtual wallet
  metadata?: Record<string, any>;
}

export interface TransferResponseDto {
  transferReference: string;
  amount: number;
  status: TransferStatus;
  recipientAccountNumber: string;
  recipientBankCode: string;
  narration: string;
  dateInitiated: string;
  provider: PaymentProviderType;
  providerResponse?: any;
}

export enum TransferStatus {
  SUCCESS = 'SUCCESS',
  PENDING = 'PENDING',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
}

export interface ResolveBankAccountDto {
  accountNumber: string;
  bankCode: string;
}

export interface BankAccountDetailsDto {
  accountNumber: string;
  accountName: string;
  bankCode: string;
  bankName?: string;
}


export interface WebhookEventDto {
  eventType: string;
  eventData: {
    transactionReference: string;
    paymentReference: string;
    amount: number;
    amountPaid: number;
    customerName: string;
    customerEmail: string;
    paymentStatus: string;
    paymentMethod: string;
    paidOn: string;
    currency: string;
    metadata?: Record<string, any>;
  };
  provider: PaymentProviderType;
}