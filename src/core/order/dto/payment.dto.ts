import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Min,
  ValidateNested
} from 'class-validator';
import { PaymentMethod } from '../interfaces/order.interface';

// Move PaymentEventData class definition BEFORE PaymentCallbackDto
export class PaymentEventCustomer {
  @ApiProperty({ description: 'Customer name', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Customer email', example: 'john.doe@example.com' })
  @IsString()
  @IsNotEmpty()
  email: string;
}

export class PaymentEventData {
  @ApiProperty({ description: 'Product type', example: 'COLLECTION' })
  @IsString()
  productType: string;

  @ApiProperty({ description: 'Transaction reference', example: 'TXN-ABCDEFGH' })
  @IsNotEmpty()
  @IsString()
  transactionReference: string;

  @ApiProperty({ description: 'Payment reference', example: 'PSTK-12345678' })
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

  @ApiProperty({ type: PaymentEventCustomer })
  @ValidateNested()
  @Type(() => PaymentEventCustomer)
  customer: PaymentEventCustomer;

  @ApiProperty({
    description: 'Metadata (optional)',
    example: { orderId: '12345' },
    required: false
  })
  @IsOptional()
  @IsObject()
  metaData?: Record<string, any>;
}

export class PaymentCallbackDto {
  @ApiProperty({ description: 'Event type', example: 'SUCCESSFUL_TRANSACTION' })
  @IsNotEmpty()
  @IsString()
  eventType: string;

  @ApiProperty({ type: PaymentEventData })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => PaymentEventData)
  eventData: PaymentEventData;
}

export class InitiatePaymentDto {
  @ApiProperty({ description: 'Order ID', example: 1 })
  @IsNotEmpty()
  @IsNumber()
  orderId: number;

  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    example: PaymentMethod.BANK_TRANSFER
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
    example: PaymentMethod.BANK_TRANSFER
  })
  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ description: 'Payment amount', example: 15000.00 })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ description: 'Payment reference', example: 'BANK_TRANSFER-12345678' })
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


export class WebhookCustomerDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsString()
  @IsNotEmpty()
  email: string;
}


export class WebhookProductDto {
  @ApiProperty({ example: 'TXN-79C925E3' })
  @IsString()
  reference: string;

  @ApiProperty({ example: 'WEB_SDK' })
  @IsString()
  type: string;
}


export class WebhookCardDetailsDto {
  @ApiProperty({ example: '1111' })
  @IsOptional()
  @IsString()
  last4?: string;

  @ApiProperty({ example: '09' })
  @IsOptional()
  @IsString()
  expMonth?: string;

  @ApiProperty({ example: '411111******1111' })
  @IsOptional()
  @IsString()
  maskedPan?: string;

  @ApiProperty({ example: '27' })
  @IsOptional()
  @IsString()
  expYear?: string;

  @ApiProperty({ example: '411111' })
  @IsOptional()
  @IsString()
  bin?: string;

  @ApiProperty({ example: false })
  @IsOptional()
  reusable?: boolean;
}



export class WebhookEventDataDto {
  @ApiProperty({ type: WebhookProductDto })
  @ValidateNested()
  @Type(() => WebhookProductDto)
  product: WebhookProductDto;

  @ApiProperty({ example: 'MNFY|87|20251111163333|000481' })
  @IsString()
  transactionReference: string;

  @ApiProperty({ example: 'TXN-79C925E3' })
  @IsString()
  paymentReference: string;

  @ApiProperty({ example: '2025-11-11 16:33:55.0' })
  @IsString()
  paidOn: string;

  @ApiProperty({ example: 'Payment for Order ORD-2D7DC94A' })
  @IsString()
  paymentDescription: string;

  @ApiProperty({ example: {} })
  @IsObject()
  @IsOptional()
  metaData: Record<string, any>;

  @ApiProperty({ example: [] })
  @IsOptional()
  paymentSourceInformation: any[];

  @ApiProperty({ example: {} })
  @IsOptional()
  destinationAccountInformation: Record<string, any>;

  @ApiProperty({ example: 59.98 })
  @IsNumber()
  @IsPositive()
  amountPaid: number;

  @ApiProperty({ example: 59.98 })
  @IsNumber()
  @IsPositive()
  totalPayable: number;

  @ApiProperty({ type: WebhookCardDetailsDto })
  @ValidateNested()
  @Type(() => WebhookCardDetailsDto)
  @IsOptional()
  cardDetails?: WebhookCardDetailsDto;

  @ApiProperty({ example: 'CARD' })
  @IsString()
  paymentMethod: string;

  @ApiProperty({ example: 'NGN' })
  @IsString()
  currency: string;

  @ApiProperty({ example: '49.98' })
  settlementAmount: string | number;

  @ApiProperty({ example: 'PAID' })
  @IsString()
  paymentStatus: string;

  @ApiProperty({ type: WebhookCustomerDto })
  @ValidateNested()
  @Type(() => WebhookCustomerDto)
  customer: WebhookCustomerDto;
}
