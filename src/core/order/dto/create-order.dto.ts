import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionMedium, ProductDetails } from '../entity/order.entity';



export class ProductDetailsDto implements ProductDetails {
  @ApiProperty({
    description: 'Product ID',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  productId: number;

  @ApiProperty({
    description: 'Quantity of the product',
    example: 2,
  })
  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @ApiProperty({
    description: 'Colour of the product',
    example: 'Red',
  })
  @IsString()
  @IsNotEmpty()
  colour: string;
}

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
    description: 'Array of product details including product ID, quantity, and colour',
    type: [ProductDetailsDto],
    example: [
      {
        productId: 1,
        quantity: 2,
        colour: 'Red'
      },
      {
        productId: 2,
        quantity: 1,
        colour: 'Blue'
      }
    ]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductDetailsDto)
  @IsNotEmpty()
  productDetails: ProductDetailsDto[];
}
