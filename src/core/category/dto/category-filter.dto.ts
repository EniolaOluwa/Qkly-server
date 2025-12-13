import { ApiProperty } from '@nestjs/swagger';

export class CategoryProductDto {
  @ApiProperty({ description: 'Product ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Product name', example: 'Nike Air Max' })
  name: string;

  @ApiProperty({ description: 'Product price', example: '25000.00' })
  price: string;

  @ApiProperty({ description: 'Quantity in stock', example: 50 })
  quantityInStock: number;

  @ApiProperty({ description: 'Product images', type: [String] })
  images: string[];

  @ApiProperty({ description: 'Business name', example: 'Fashion Hub' })
  businessName: string;

  @ApiProperty({ description: 'Business ID', example: 1 })
  businessId: number;

  @ApiProperty({ description: 'Date created', example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;
}