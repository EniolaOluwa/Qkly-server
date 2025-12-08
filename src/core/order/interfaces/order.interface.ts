import { PaymentEventCustomer } from "../dto/payment.dto";
import { RefundMethod, RefundType } from "../dto/refund.dto";

export enum OrderItemStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED',
  REFUNDED = 'REFUNDED',
}


export enum PaymentMethod {
  MONNIFY = 'MONNIFY',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CARD = 'CARD',
  WALLET = 'WALLET',
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY',
  USSD = 'USSD',
}

export enum DeliveryMethod {
  STANDARD = 'STANDARD',
  EXPRESS = 'EXPRESS',
  PICKUP = 'PICKUP',
}
export interface OrderItemDetails {
  productId: number;
  quantity: number;
  color?: string;
  size?: string;
}

export interface DeliveryDetails {
  trackingNumber?: string;
  carrier?: string;
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  deliveryNotes?: string;
  deliveryProof?: string;
  signedBy?: string;
  meta?: any;

}
export interface SettlementDetails {
  businessId: number;
  businessName: string;
  amount: number;
  platformFee: number;
  settlementAmount: number;
  reference: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  settlementDate?: Date;
  accountNumber?: string;
  bankName?: string;
  meta?: any;
}

export interface PaymentEventData {
  productType: string;
  transactionReference: string;
  paymentReference: string;
  amountPaid: number;
  totalPayment: number;
  settlementAmount: number;
  paymentStatus: string;
  paymentMethod: string;
  paidOn: string;
  customer: PaymentEventCustomer;
  metaData?: Record<string, any>;
}

export interface PaymentDetails {
  paymentMethod: PaymentMethod;
  paymentReference: string;
  transactionReference: string;
  paymentDate: Date;
  amount: number;
  currency: string;

  status?: string;
  statusMessage?: string;
  failureReason?: string;
  failedAt?: Date;

  provider?: string;
  providerFee?: number;
  settlementAmount?: number;

  card?: {
    last4?: string;
    bin?: string;
    type?: string;
    expiryMonth?: string;
    expiryYear?: string;
    cardHolder?: string;
    reusable?: boolean;
  };

  bank?: {
    accountNumber?: string;
    bankName?: string;
    bankCode?: string;
    accountName?: string;
    narration?: string;
  };

  mobile?: {
    phoneNumber?: string;
    provider?: string;
    reference?: string;
  };

  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };

  providerResponse?: Record<string, any>;

  meta?: Record<string, any>;

  receiptNumber?: string;
  invoiceReference?: string;
}

export enum RefundStatus {
  REQUESTED = 'REQUESTED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  PARTIALLY_COMPLETED = 'PARTIALLY_COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum RefundTransactionType {
  PLATFORM_REFUND = 'PLATFORM_REFUND',
  BUSINESS_REFUND = 'BUSINESS_REFUND',
}

export enum RefundTransactionStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export interface RefundTransaction {
  type: RefundTransactionType;
  amount: number;
  reference: string;       // e.g., wallet tx or bank reversal ref
  status: RefundTransactionStatus;
  processedAt?: Date | null;
}




export interface RefundDetails {
  // Core
  refundReference: string;
  amountRequested: number;
  amountApproved: number;
  amountRefunded: number;
  remainingAmount: number;

  // Status
  status: RefundStatus;

  // Notes
  reason: string;
  refundType: RefundType;
  refundMethod: RefundMethod;
  customerNote?: string;
  merchantNote?: string;

  // Actors
  requestedBy: number;
  approvedBy?: number;
  refundedBy?: number;

  // Timeline
  requestedAt: Date;
  approvedAt?: Date | null;
  processingAt?: Date | null;
  refundedAt?: Date | null;
  failedAt?: Date | null;
  cancelledAt?: Date | null;

  // Transaction events
  transactions: RefundTransaction[];

  // Extra metadata
  meta?: Record<string, any>;
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED',
  REFUNDED = 'REFUNDED',
  COMPLETED = 'COMPLETED',
}

export interface OrderStatusHistory {
  status: OrderStatus;
  timestamp: Date;
  updatedBy?: number | null;
  notes?: string;
  metadata?: Record<string, any>;
}
