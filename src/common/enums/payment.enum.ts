export enum PaymentProvider {
  PAYSTACK = 'paystack',
  // Future providers can be added here
  // FLUTTERWAVE = 'flutterwave',
  // SQUAD = 'squad',
}

export enum WalletStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  CLOSED = 'closed',
}

export enum BankAccountStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed',
  INACTIVE = 'inactive',
}

export enum PaymentAccountStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export enum PaymentStatus {
  PENDING = 'pending',
  INITIATED = 'initiated',
  PROCESSING = 'processing',
  PAID = 'paid',
  FAILED = 'failed',
  EXPIRED = 'expired',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

export enum PaymentMethod {
  BANK_TRANSFER = 'bank_transfer',
  CARD = 'card',
  WALLET = 'wallet',
  USSD = 'ussd',
  CASH_ON_DELIVERY = 'cash_on_delivery',
}

export enum TransactionType {
  ORDER_PAYMENT = 'order_payment',
  SETTLEMENT = 'settlement',
  WITHDRAWAL = 'withdrawal',
  REFUND = 'refund',
  WALLET_FUNDING = 'wallet_funding',
  FEE = 'fee',
  COMMISSION = 'commission',
}

export enum TransactionFlow {
  CREDIT = 'credit',
  DEBIT = 'debit',
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  REVERSED = 'reversed',
  CANCELLED = 'cancelled',
}
