import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
  Min,
  Matches,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({
    description: 'User ID who owns the product',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @ApiProperty({
    description: 'Business ID for the product',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  businessId: number;

  @ApiProperty({
    description: 'Array of product image URLs',
    example: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
    ],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({
    description: 'Product color in hex format',
    example: '#FF5733',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Color must be a valid hex color code (e.g., #FF5733)',
  })
  color?: string;

  @ApiProperty({
    description: 'Product title',
    example: 'Premium Cotton T-Shirt',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Product description',
    example: 'High-quality cotton t-shirt with premium finish',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Product price',
    example: 29.99,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0, { message: 'Price must be a positive number' })
  price: number;
}
