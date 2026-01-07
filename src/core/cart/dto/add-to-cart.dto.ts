import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, IsEmail, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// Single cart item structure
export class AddToCartItemDto {
  @ApiProperty({ description: 'Product ID', example: 1 })
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  productId: number;

  @ApiProperty({ description: 'Product Variant ID (SKU). Optional for simple products.', example: 12, required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  variantId?: number;

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

// Request body for adding items to cart (always an array)
export class AddToCartDto {
  @ApiProperty({
    description: 'Array of items to add to cart',
    type: [AddToCartItemDto],
    example: [{ productId: 1, quantity: 2 }, { productId: 3, variantId: 5, quantity: 1 }]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddToCartItemDto)
  items: AddToCartItemDto[];

  @ApiProperty({ description: 'Guest Email (optional)', example: 'guest@example.com', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: 'Currency code (optional, defaults to product currency)', example: 'NGN', required: false })
  @IsString()
  @IsOptional()
  currency?: string;
}
