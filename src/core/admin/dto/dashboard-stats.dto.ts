import { ApiProperty } from '@nestjs/swagger';

export class DashboardStatsDto {
  @ApiProperty({
    description: 'Total number of orders in the system',
    example: 1250,
  })
  totalOrders: number;

  @ApiProperty({
    description: 'Total number of registered merchants/businesses',
    example: 45,
  })
  totalMerchants: number;

  @ApiProperty({
    description: 'Total number of products across all merchants',
    example: 3420,
  })
  totalProducts: number;

  @ApiProperty({
    description: 'Total number of product categories',
    example: 28,
  })
  totalCategories: number;

  @ApiProperty({
    description: 'Total number of transactions',
    example: 2340,
  })
  totalTransactions: number;
}
