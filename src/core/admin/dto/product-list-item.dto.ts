import { ApiProperty } from '@nestjs/swagger';

export class ProductListItemDto {
  @ApiProperty({
    description: 'Product ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Product name',
    example: 'Blue Cotton T-Shirt',
  })
  name: string;

  @ApiProperty({
    description: 'Product description',
    example: 'Comfortable cotton t-shirt in various sizes',
    nullable: true,
  })
  description?: string;

  @ApiProperty({
    description: 'Product price',
    example: '2500.00',
  })
  price: string;

  @ApiProperty({
    description: 'Quantity in stock',
    example: 45,
  })
  quantityInStock: number;

  @ApiProperty({
    description: 'Stock status based on quantity',
    example: 'IN_STOCK',
    enum: ['IN_STOCK', 'OUT_OF_STOCK', 'LOW_STOCK'],
  })
  stockStatus: string;

  @ApiProperty({
    description: 'Business/Merchant ID',
    example: 5,
  })
  businessId: number;

  @ApiProperty({
    description: 'Business name',
    example: 'Fashion Store',
  })
  businessName: string;

  @ApiProperty({
    description: 'Category ID',
    example: 1,
  })
  categoryId: number;

  @ApiProperty({
    description: 'Category name',
    example: 'Clothing',
  })
  categoryName: string;

  @ApiProperty({
    description: 'Merchant/Owner email',
    example: 'merchant@example.com',
  })
  ownerEmail: string;

  @ApiProperty({
    description: 'Whether product has variations (size/color)',
    example: true,
  })
  hasVariation: boolean;

  @ApiProperty({
    description: 'Product image URLs',
    type: [String],
    example: ['https://example.com/image1.jpg'],
  })
  images: string[];

  @ApiProperty({
    description: 'Total quantity sold (from order items)',
    example: 125,
  })
  totalSold: number;

  @ApiProperty({
    description: 'Total revenue generated from this product',
    example: '312500.00',
  })
  totalRevenue: string;

  @ApiProperty({
    description: 'Date product was created',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Date product was last updated',
    example: '2024-03-20T15:45:00Z',
  })
  updatedAt: Date;
}

export class ProductsListResponseDto {
  @ApiProperty({
    description: 'Array of products',
    type: [ProductListItemDto],
  })
  data: ProductListItemDto[];

  @ApiProperty({
    description: 'Pagination metadata',
  })
  meta: {
    page: number;
    limit: number;
    itemCount: number;
    pageCount: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}
