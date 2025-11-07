import { PaymentEventCustomer } from "../dto/payment.dto";

export enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  CONFIRMED = 'CONFIRMED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED',
  REFUNDED = 'REFUNDED',
}

export enum OrderItemStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  INITIATED = 'INITIATED',
  PAID = 'PAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  EXPIRED = 'EXPIRED',
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

export interface PaymentDetails {
  paymentMethod: PaymentMethod;
  paymentReference: string;
  transactionReference?: string;
  accountNumber?: string;
  bankName?: string;
  cardLast4?: string;
  cardType?: string;
  paymentDate: Date;
  amount: number;
  currency: string;
  meta?: any;
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

// Add Monnify specific interfaces

export interface MonnifyPaymentResponse {
  requestSuccessful: boolean;
  responseMessage?: string;
  responseCode?: string;
  responseBody: {
    transactionReference?: string;
    paymentReference?: string;
    merchantName?: string;
    apiKey?: string;
    amount?: number;
    currencyCode?: string;
    customerName?: string;
    customerEmail?: string;
    paymentDescription?: string;
    paymentMethods?: string[];
    paymentMethod?: string;
    transactionHash?: string;
    merchantCode?: string;
    checkoutUrl: string;
    defaultPaymentMethod?: string;
    expiresAt?: string;
    amountPaid?: number;
    completedOn?: string;
  };
}

export interface MonnifyTransaction {
  amount: number;
  currencyCode: string;
  customerEmail: string;
  customerName: string;
  paymentDescription?: string;
  paymentReference: string;
  paymentStatus: string;
  transactionReference: string;
  paymentMethod: string;
  paidAmount: number;
  createdOn: string;
  transactionHash: string;
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