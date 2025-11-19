// dto/refund.dto.ts

import { IsNumber, IsString, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum RefundType {
  FULL = 'FULL',
  PARTIAL = 'PARTIAL',
}

export enum RefundMethod {
  ORIGINAL_PAYMENT = 'ORIGINAL_PAYMENT', // Refund to customer's original payment method
  WALLET = 'WALLET', // Refund to customer's wallet (if they have one)
}

export class CreateRefundDto {
  @ApiProperty({ description: 'Order ID to refund' })
  @IsNumber()
  orderId: number;

  @ApiProperty({
    description: 'Refund type',
    enum: RefundType,
    default: RefundType.FULL
  })
  @IsEnum(RefundType)
  refundType: RefundType;

  @ApiProperty({
    description: 'Amount to refund (required for partial refunds)',
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiProperty({ description: 'Reason for refund' })
  @IsString()
  reason: string;

  @ApiProperty({
    description: 'Refund method',
    enum: RefundMethod,
    default: RefundMethod.ORIGINAL_PAYMENT
  })
  @IsEnum(RefundMethod)
  refundMethod: RefundMethod;

  @ApiProperty({ description: 'Note for customer', required: false })
  @IsOptional()
  @IsString()
  customerNote?: string;

  @ApiProperty({ description: 'Internal merchant note', required: false })
  @IsOptional()
  @IsString()
  merchantNote?: string;
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