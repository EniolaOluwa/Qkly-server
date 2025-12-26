import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddToCartDto {
  @ApiProperty({ description: 'Product ID', example: 1 })
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  productId: number;

  @ApiProperty({ description: 'Product Variant ID (SKU)', example: 12 })
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  variantId: number;

  @ApiProperty({ description: 'Quantity', example: 1, default: 1 })
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  quantity: number;

  @ApiProperty({ description: 'Customer notes', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
