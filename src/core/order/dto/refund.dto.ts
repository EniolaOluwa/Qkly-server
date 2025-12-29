// dto/refund.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

import { RefundMethod, RefundReason, RefundType } from '../../../common/enums/order.enum';

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
    example: RefundReason.MERCHANT_CANCELLED,
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
    example: 'wallet',
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