import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsPositive,
  IsObject,
  ValidateNested,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod, PaymentStatus } from '../interfaces/order.interface';

export class InitiatePaymentDto {
  @ApiProperty({ description: 'Order ID', example: 1 })
  @IsNotEmpty()
  @IsNumber()
  orderId: number;

  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    example: PaymentMethod.MONNIFY
  })
  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({
    description: 'Redirect URL after payment',
    example: 'https://example.com/payment/success',
    required: false
  })
  @IsOptional()
  @IsString()
  @Matches(/^https?:\/\/.+/)
  redirectUrl?: string;

  @ApiProperty({
    description: 'Payment metadata (optional)',
    example: { customerDevice: 'mobile', source: 'web' },
    required: false
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class ProcessPaymentDto {
  @ApiProperty({ description: 'Order ID', example: 1 })
  @IsNotEmpty()
  @IsNumber()
  orderId: number;

  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    example: PaymentMethod.MONNIFY
  })
  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ description: 'Payment amount', example: 15000.00 })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ description: 'Payment reference', example: 'MONNIFY-12345678' })
  @IsNotEmpty()
  @IsString()
  paymentReference: string;

  @ApiProperty({
    description: 'Payment metadata (optional)',
    example: { channel: 'web', ipAddress: '192.168.1.1' },
    required: false
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

// For Monnify webhook callback
export class PaymentCallbackDto {
  @ApiProperty({ description: 'Event type', example: 'SUCCESSFUL_TRANSACTION' })
  @IsNotEmpty()
  @IsString()
  eventType: string;

  @ApiProperty()
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => PaymentEventData)
  eventData: PaymentEventData;
}

export class PaymentEventData {
  @ApiProperty({ description: 'Product type', example: 'COLLECTION' })
  @IsString()
  productType: string;

  @ApiProperty({ description: 'Transaction reference', example: 'TXN-ABCDEFGH' })
  @IsNotEmpty()
  @IsString()
  transactionReference: string;

  @ApiProperty({ description: 'Payment reference', example: 'MONNIFY-12345678' })
  @IsNotEmpty()
  @IsString()
  paymentReference: string;

  @ApiProperty({ description: 'Amount paid', example: 15000.00 })
  @IsNumber()
  @IsPositive()
  amountPaid: number;

  @ApiProperty({ description: 'Total payment', example: 15000.00 })
  @IsNumber()
  @IsPositive()
  totalPayment: number;

  @ApiProperty({ description: 'Settlement amount', example: 14700.00 })
  @IsNumber()
  settlementAmount: number;

  @ApiProperty({ description: 'Payment status', example: 'PAID' })
  @IsString()
  paymentStatus: string;

  @ApiProperty({ description: 'Payment method', example: 'CARD' })
  @IsString()
  paymentMethod: string;

  @ApiProperty({ description: 'Paid on', example: '2023-01-15T10:30:00.000Z' })
  @IsString()
  paidOn: string;

  @ApiProperty({ description: 'Customer name', example: 'John Doe' })
  @IsString()
  customer: { name: string; email: string };

  @ApiProperty({
    description: 'Metadata (optional)',
    example: { orderId: '12345' },
    required: false
  })
  @IsOptional()
  @IsObject()
  metaData?: Record<string, any>;
}

export class VerifyPaymentDto {
  @ApiProperty({ description: 'Transaction reference', example: 'TXN-ABCDEFGH' })
  @IsString()
  @IsNotEmpty()
  transactionReference: string;
}




export class RefundPaymentDto {
  @ApiProperty({ description: 'Order ID', example: 1 })
  @IsNotEmpty()
  @IsNumber()
  orderId: number;

  @ApiProperty({ description: 'Refund amount', example: 15000.00 })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ description: 'Refund reason', example: 'Customer returned the product' })
  @IsNotEmpty()
  @IsString()
  reason: string;

  @ApiProperty({
    description: 'Refund metadata (optional)',
    example: { approvedBy: 'admin', returnedCondition: 'good' },
    required: false
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class SettleBusinessDto {
  @ApiProperty({ description: 'Order ID', example: 1 })
  @IsNotEmpty()
  @IsNumber()
  orderId: number;

  @ApiProperty({ description: 'Amount to settle', example: 14250.00, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiProperty({
    description: 'Settlement method',
    example: 'BANK_TRANSFER',
    required: false
  })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiProperty({
    description: 'Settlement metadata (optional)',
    example: { settlementBatch: '20230115-001' },
    required: false
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

