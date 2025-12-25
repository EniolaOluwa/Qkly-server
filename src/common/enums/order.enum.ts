export enum OrderStatus {
  PENDING = 'pending',
  PAYMENT_INITIATED = 'payment_initiated',
  PAID = 'paid',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  RETURNED = 'returned',
  REFUNDED = 'refunded',
}

export enum OrderItemStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  RETURNED = 'returned',
  REFUNDED = 'refunded',
}

export enum DeliveryMethod {
  STANDARD = 'standard',
  EXPRESS = 'express',
  PICKUP = 'pickup',
}

export enum RefundStatus {
  REQUESTED = 'requested',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  PARTIALLY_COMPLETED = 'partially_completed',
  FAILED = 'failed',
  REJECTED = 'rejected',
}

export enum RefundType {
  FULL = 'full',
  PARTIAL = 'partial',
}

export enum RefundMethod {
  ORIGINAL_PAYMENT = 'original_payment',
  WALLET = 'wallet',
  BANK_ACCOUNT = 'bank_account',
}

export enum RefundReason {
  CUSTOMER_REQUEST = 'customer_request',
  OUT_OF_STOCK = 'out_of_stock',
  DAMAGED_PRODUCT = 'damaged_product',
  WRONG_ITEM = 'wrong_item',
  MERCHANT_CANCELLED = 'merchant_cancelled',
  PAYMENT_ISSUE = 'payment_issue',
  FRAUD = 'fraud',
  OTHER = 'other',
}
