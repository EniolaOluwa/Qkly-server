import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { PaymentStatus } from '../../payment/types/payment.status';
import {
  DeliveryMethod,
  OrderStatus,
  PaymentMethod,
} from '../interfaces/order.interface';

/**
 * DTO for user data in order responses
 */
export class OrderUserDto {
  @ApiProperty({ example: 1 })
  @Expose()
  id: number;

  @ApiProperty({ example: 'John' })
  @Expose()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @Expose()
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @Expose()
  email: string;
}

/**
 * DTO for business data in order responses
 */
export class OrderBusinessDto {
  @ApiProperty({ example: 1 })
  @Expose()
  id: number;

  @ApiProperty({ example: 'Acme Restaurant' })
  @Expose()
  businessName: string;

  @ApiProperty({ example: '123 Main St, New York, NY 10001' })
  @Expose()
  location: string;

  @ApiProperty({ example: 'https://example.com/logo.png' })
  @Expose()
  logo: string;
}

/**
 * DTO for order item data in order responses
 */
export class OrderItemDto {
  @ApiProperty({ example: 1 })
  @Expose()
  id: number;

  @ApiProperty({ example: 1 })
  @Expose()
  orderId: number;

  @ApiProperty({ example: 4 })
  @Expose()
  productId: number;

  @ApiProperty({ example: 'Premium T-Shirt' })
  @Expose()
  productName: string;

  @ApiProperty({ example: 'High-quality cotton t-shirt with premium finish' })
  @Expose()
  productDescription: string;

  @ApiProperty({ example: 29.99 })
  @Expose()
  price: number;

  @ApiProperty({ example: 2 })
  @Expose()
  quantity: number;

  @ApiProperty({ example: 59.98 })
  @Expose()
  subtotal: number;

  @ApiProperty({ example: '#FF5733' })
  @Expose()
  color: string;

  @ApiProperty({ example: 'M' })
  @Expose()
  size: string;

  @ApiProperty({ example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'] })
  @Expose()
  imageUrls: string[];

  @ApiProperty({ example: 'PENDING', enum: ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED'] })
  @Expose()
  status: string;

  @ApiProperty({ example: 'Please handle with care', required: false })
  @Expose()
  notes?: string;
}

/**
 * DTO for complete order responses
 */
export class OrderResponseDto {
  @ApiProperty({ example: 1 })
  @Expose()
  id: number;

  @ApiProperty({ example: 'ORD-F136CC86' })
  @Expose()
  orderReference: string;

  @ApiProperty({ example: 1 })
  @Expose()
  userId: number;

  @ApiProperty()
  @Type(() => OrderUserDto)
  @Expose()
  user: OrderUserDto;

  @ApiProperty({ example: 1 })
  @Expose()
  businessId: number;

  @ApiProperty()
  @Type(() => OrderBusinessDto)
  @Expose()
  business: OrderBusinessDto;

  @ApiProperty({ example: 'TXN-98C9ACDA' })
  @Expose()
  transactionReference: string;

  @ApiProperty({ example: 'John Doe' })
  @Expose()
  customerName: string;

  @ApiProperty({ example: '123 Main Street, Apartment 4B' })
  @Expose()
  deliveryAddress: string;

  @ApiProperty({ example: 'Lagos' })
  @Expose()
  state: string;

  @ApiProperty({ example: 'Ikeja' })
  @Expose()
  city: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @Expose()
  customerEmail: string;

  @ApiProperty({ example: '+2348012345678' })
  @Expose()
  customerPhoneNumber: string;

  @ApiProperty({ example: 'PENDING', enum: OrderStatus })
  @Expose()
  status: OrderStatus;

  @ApiProperty({ example: 'PENDING', enum: PaymentStatus })
  @Expose()
  paymentStatus: PaymentStatus;

  @ApiProperty({ example: 'BANK_TRANSFER', enum: PaymentMethod })
  @Expose()
  paymentMethod: PaymentMethod;

  @ApiProperty({ example: 'STANDARD', enum: DeliveryMethod })
  @Expose()
  deliveryMethod: DeliveryMethod;

  @ApiProperty({ example: 59.98 })
  @Expose()
  subtotal: number;

  @ApiProperty({ example: 0.00 })
  @Expose()
  shippingFee: number;

  @ApiProperty({ example: 0.00 })
  @Expose()
  tax: number;

  @ApiProperty({ example: 0.00 })
  @Expose()
  discount: number;

  @ApiProperty({ example: 59.98 })
  @Expose()
  total: number;

  @ApiProperty({ example: null, required: false })
  @Expose()
  paymentDate?: Date;

  @ApiProperty({ example: null, required: false })
  @Expose()
  paymentDetails?: any;

  @ApiProperty({ example: null, required: false })
  @Expose()
  estimatedDeliveryDate?: Date;

  @ApiProperty({ example: null, required: false })
  @Expose()
  deliveryDate?: Date;

  @ApiProperty({ example: null, required: false })
  @Expose()
  deliveryDetails?: any;

  @ApiProperty({ example: 'Please leave at front door', required: false })
  @Expose()
  notes?: string;

  @ApiProperty({ type: [OrderItemDto] })
  @Type(() => OrderItemDto)
  @Expose()
  items: OrderItemDto[];

  @ApiProperty({ example: false })
  @Expose()
  isBusinessSettled: boolean;

  @ApiProperty({ example: null, required: false })
  @Expose()
  settlementReference?: string;

  @ApiProperty({ example: null, required: false })
  @Expose()
  settlementDate?: Date;

  @ApiProperty({ example: null, required: false })
  @Expose()
  settlementDetails?: any;

  @ApiProperty({ example: '2025-11-07T09:32:27.763Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2025-11-07T09:32:27.763Z' })
  @Expose()
  updatedAt: Date;
}

/**
 * DTO for minimal order information (used in lists)
 */
export class OrderSummaryDto {
  @ApiProperty({ example: 1 })
  @Expose()
  id: number;

  @ApiProperty({ example: 'ORD-F136CC86' })
  @Expose()
  orderReference: string;

  @ApiProperty({ example: 'John Doe' })
  @Expose()
  customerName: string;

  @ApiProperty({ example: 'PENDING', enum: OrderStatus })
  @Expose()
  status: OrderStatus;

  @ApiProperty({ example: 'PENDING', enum: PaymentStatus })
  @Expose()
  paymentStatus: PaymentStatus;

  @ApiProperty({ example: 'BANK_TRANSFER', enum: PaymentMethod })
  @Expose()
  paymentMethod: PaymentMethod;

  @ApiProperty({ example: 59.98 })
  @Expose()
  total: number;

  @ApiProperty({ example: '2025-11-07T09:32:27.763Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: 2 })
  @Expose()
  itemCount: number;
}