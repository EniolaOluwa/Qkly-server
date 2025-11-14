import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength
} from 'class-validator';
import { PaymentMethod, PaymentStatus } from '../../order/interfaces/order.interface';

export class ManualPaymentUpdateDto {
  @ApiProperty({
    description: 'Order ID to update',
    example: 1,
    required: true
  })
  @IsNotEmpty()
  @IsNumber()
  orderId: number;

  @ApiProperty({
    description: 'Transaction reference (optional if order already has one)',
    example: 'TXN-ABCDEFGH',
    required: false
  })
  @IsOptional()
  @IsString()
  transactionReference?: string;

  @ApiProperty({
    description: 'Payment reference from payment provider',
    example: 'MONNIFY-12345678',
    required: false
  })
  @IsOptional()
  @IsString()
  paymentReference?: string;

  @ApiProperty({
    description: 'Payment status to set',
    enum: PaymentStatus,
    example: PaymentStatus.PAID,
    required: true
  })
  @IsNotEmpty()
  @IsEnum(PaymentStatus)
  paymentStatus: PaymentStatus;

  @ApiProperty({
    description: 'Payment method used',
    enum: PaymentMethod,
    example: PaymentMethod.CARD,
    required: true
  })
  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({
    description: 'Payment amount (optional if using order total)',
    example: 15000.00,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;

  @ApiProperty({
    description: 'Source used to verify payment',
    example: 'Payment Gateway Dashboard',
    required: true
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  verificationSource: string;

  @ApiProperty({
    description: 'Admin notes explaining why manual verification was needed',
    example: 'Webhook failed but payment confirmed in Monnify dashboard',
    required: true
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  adminNotes: string;

  @ApiProperty({
    description: 'Additional metadata for the manual update (optional)',
    example: { receiptNumber: '12345', bankConfirmationCode: 'ABC123' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}