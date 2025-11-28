// dto/refund.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export enum RefundType {
  FULL = 'FULL',
  PARTIAL = 'PARTIAL',
}

export enum RefundMethod {
  ORIGINAL_PAYMENT = 'ORIGINAL_PAYMENT', // Refund to customer's original payment method
  WALLET = 'WALLET', // Refund to customer's wallet (if they have one)
}


export enum RefundReason {
  ORDER_REJECTED = 'ORDER_REJECTED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  PRODUCT_DEFECTIVE = 'PRODUCT_DEFECTIVE',
  WRONG_ITEM_SHIPPED = 'WRONG_ITEM_SHIPPED',
  CUSTOMER_REQUEST = 'CUSTOMER_REQUEST',
  DUPLICATE_ORDER = 'DUPLICATE_ORDER',
  OTHER = 'OTHER',
}

export class InitiateRefundDto {
  @ApiProperty({
    description: 'Order ID to refund',
    example: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  orderId: number;

  @ApiProperty({
    description: 'Refund type',
    enum: RefundType,
    example: RefundType.FULL,
  })
  @IsNotEmpty()
  @IsEnum(RefundType)
  refundType: RefundType;

  @ApiPropertyOptional({
    description: 'Refund amount (required for partial refunds)',
    example: 5000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiProperty({
    description: 'Reason for refund',
    enum: RefundReason,
    example: RefundReason.ORDER_REJECTED,
  })
  @IsNotEmpty()
  @IsEnum(RefundReason)
  reason: RefundReason;

  @ApiPropertyOptional({
    description: 'Additional details about the refund reason',
    example: 'Product was out of stock',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reasonDetails?: string;

  @ApiProperty({
    description: 'Refund method',
    enum: RefundMethod,
    example: RefundMethod.ORIGINAL_PAYMENT,
  })
  @IsNotEmpty()
  @IsEnum(RefundMethod)
  refundMethod: RefundMethod;

  @ApiPropertyOptional({
    description: 'Note for customer',
    example: 'Your refund will be processed within 3-5 business days',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  customerNote?: string;

  @ApiPropertyOptional({
    description: 'Internal merchant note',
    example: 'Product defective - batch #12345',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  merchantNote?: string;
}



export class RefundStatusDto {
  @ApiProperty({ description: 'Refund status', example: 'SUCCESS' })
  status: string;

  @ApiProperty({ description: 'Order reference', example: 'ORD-12345678' })
  orderReference: string;

  @ApiProperty({ description: 'Refund amount', example: 10000 })
  amount: number;

  @ApiProperty({ description: 'Refund type', example: 'FULL' })
  refundType: string;

  @ApiProperty({ description: 'Refund method', example: 'ORIGINAL_PAYMENT' })
  refundMethod: string;

  @ApiProperty({ description: 'Platform refund reference', example: 'REF-PLATFORM-12345' })
  platformRefundReference?: string;

  @ApiProperty({ description: 'Business refund reference', example: 'REF-BUSINESS-12345' })
  businessRefundReference?: string;

  @ApiProperty({ description: 'Refund date' })
  refundDate: Date;
}

export class RefundResponseDto {
  success: boolean;
  message: string;
  data: {
    orderId: number;
    orderReference: string;
    refundReference: string;
    refundAmount: number;
    refundType: RefundType;
    status: string;
    transactions: Array<{
      type: string;
      amount: number;
      reference: string;
      status: string;
    }>;
  };
}