export interface ProductDetails {
  productId: number;
  quantity: number;
  colour: string;
}


export enum OrderStatus {
  ORDERED = 'ordered',
  DISPATCHED = 'dispatched',
  DELIVERED = 'delivered',
  RETURNED = 'returned',
}


export enum TransactionMedium {
  WEB = 'web',
  MOBILE = 'mobile',
}


export enum TransactionStatus {
  PENDING = 'pending',
  SUCCESSFUL = 'successful',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}
