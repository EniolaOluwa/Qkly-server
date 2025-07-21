import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
} from 'class-validator';
import { TransactionMedium } from '../order.entity';

export class CreateOrderDto {
  @ApiProperty({
    description: 'User ID who placed the order',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @ApiProperty({
    description: 'Business ID for the order',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  businessId: number;

  @ApiProperty({
    description: 'Unique transaction reference',
    example: 'TXN_123456789',
  })
  @IsString()
  @IsNotEmpty()
  transactionRef: string;

  @ApiProperty({
    description: 'Customer full name',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @ApiProperty({
    description: 'Customer delivery address',
    example: '123 Main Street, Lagos, Nigeria',
  })
  @IsString()
  @IsNotEmpty()
  deliveryAddress: string;

  @ApiProperty({
    description: 'Customer state',
    example: 'Lagos',
  })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({
    description: 'Customer email address',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  customerEmail: string;

  @ApiProperty({
    description: 'Customer phone number',
    example: '+2348123456789',
  })
  @IsString()
  @IsNotEmpty()
  customerPhoneNumber: string;

  @ApiProperty({
    description: 'Transaction medium',
    enum: TransactionMedium,
    example: TransactionMedium.WEB,
  })
  @IsEnum(TransactionMedium)
  @IsNotEmpty()
  transactionMedium: TransactionMedium;

  @ApiProperty({
    description: 'Product details and variants',
    example: {
      productId: 1,
      quantity: 2,
      variant: 'Large',
      color: 'Red',
    },
    required: false,
  })
  @IsOptional()
  productDetails?: any;

  @ApiProperty({
    description: 'Product ID (optional)',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  productId?: number;
} 