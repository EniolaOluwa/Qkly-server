import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsEmail,
  IsString,
  IsNumber,
  IsEnum,
  IsArray,
  ValidateNested,
  IsOptional,
  Min,
  ArrayMinSize,
  IsPositive,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DeliveryMethod } from '../../../common/enums/order.enum';
import { PaymentMethod } from '../../../common/enums/payment.enum';

export class OrderItemDto {
  @ApiProperty({ description: 'Product ID', example: 1 })
  @IsNotEmpty()
  @IsNumber()
  productId: number;

  @ApiProperty({ description: 'Quantity', example: 2 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Color (optional)', example: 'Red', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string;

  @ApiProperty({ description: 'Size (optional)', example: 'XL', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  size?: string;

  @ApiProperty({ description: 'Product Variant ID', example: 12, required: false })
  @IsOptional()
  @IsNumber()
  variantId?: number;
}


export class BaseOrderDto {
  @ApiProperty({ description: 'Business ID', example: 1 })
  @IsNotEmpty()
  @IsNumber()
  businessId: number;

  @ApiProperty({ description: 'Customer name', example: 'John Doe' })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  customerName: string;

  @ApiProperty({ description: 'Customer email', example: 'john.doe@example.com' })
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(100)
  customerEmail: string;

  @ApiProperty({ description: 'Customer phone number', example: '+2348012345678' })
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  customerPhoneNumber: string;

  @ApiProperty({ description: 'Delivery address', example: '123 Main Street, Apartment 4B' })
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  @MaxLength(255)
  deliveryAddress: string;

  @ApiProperty({ description: 'State', example: 'Lagos' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  state: string;

  @ApiProperty({ description: 'City (optional)', example: 'Ikeja', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  city?: string;

  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    example: PaymentMethod.CARD
  })
  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({
    description: 'Delivery method',
    enum: DeliveryMethod,
    example: DeliveryMethod.STANDARD
  })
  @IsNotEmpty()
  @IsEnum(DeliveryMethod)
  deliveryMethod: DeliveryMethod;

  @ApiProperty({ description: 'Notes (optional)', example: 'Please leave at front door', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiProperty({ description: 'Promo code (optional)', example: 'SUMMER20', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  promoCode?: string;
}

export class CreateOrderDto extends BaseOrderDto {
  @ApiProperty({
    description: 'Order items',
    type: [OrderItemDto],
    example: [{ productId: 1, quantity: 2, color: 'Blue', size: 'M' }]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  @ArrayMinSize(1)
  items: OrderItemDto[];
}

export class CreateOrderFromCartDto extends BaseOrderDto { }