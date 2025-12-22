import { ApiProperty } from '@nestjs/swagger';

export class TopProductDto {
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
    description: 'Business name',
    example: 'Fashion Store',
  })
  businessName: string;

  @ApiProperty({
    description: 'Category name',
    example: 'Clothing',
  })
  categoryName: string;

  @ApiProperty({
    description: 'Product price',
    example: 2500.00,
  })
  price: string;

  @ApiProperty({
    description: 'Total quantity sold',
    example: 125,
  })
  totalSold: number;

  @ApiProperty({
    description: 'Total revenue generated',
    example: 312500.00,
  })
  totalRevenue: string;

  @ApiProperty({
    description: 'Current quantity in stock',
    example: 45,
  })
  quantityInStock: number;
}

export class CategoryDistributionDto {
  @ApiProperty({
    description: 'Category ID',
    example: 1,
  })
  categoryId: number;

  @ApiProperty({
    description: 'Category name',
    example: 'Electronics',
  })
  categoryName: string;

  @ApiProperty({
    description: 'Total products in this category',
    example: 250,
  })
  productCount: number;

  @ApiProperty({
    description: 'Percentage of total products',
    example: 25.5,
  })
  percentage: number;
}

export class ProductMetricsDto {
  @ApiProperty({
    description: 'Total number of products platform-wide',
    example: 3420,
  })
  totalProducts: number;

  @ApiProperty({
    description: 'Total number of products in stock (quantity > 0)',
    example: 2890,
  })
  inStockProducts: number;

  @ApiProperty({
    description: 'Total number of products out of stock (quantity = 0)',
    example: 530,
  })
  outOfStockProducts: number;

  @ApiProperty({
    description: 'Total number of products with low stock (quantity < 10)',
    example: 215,
  })
  lowStockProducts: number;

  @ApiProperty({
    description: 'Average product price across all products',
    example: 15750.50,
  })
  averagePrice: string;

  @ApiProperty({
    description: 'Total value of all inventory (price * quantity)',
    example: 45250000.00,
  })
  totalInventoryValue: string;

  @ApiProperty({
    description: 'Total number of unique merchants selling products',
    example: 125,
  })
  totalMerchants: number;

  @ApiProperty({
    description: 'Total number of products with variations',
    example: 890,
  })
  productsWithVariations: number;

  @ApiProperty({
    description: 'Top 10 best-selling products',
    type: [TopProductDto],
  })
  topProducts: TopProductDto[];

  @ApiProperty({
    description: 'Product distribution across categories',
    type: [CategoryDistributionDto],
  })
  categoryDistribution: CategoryDistributionDto[];
}
