import { ApiProperty } from '@nestjs/swagger';

export class CategoryListItemDto {
  @ApiProperty({ description: 'Category ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Category name', example: 'Electronics' })
  name: string;

  @ApiProperty({ description: 'Total products in this category', example: 156 })
  totalProducts: number;

  @ApiProperty({ description: 'Number of businesses using this category', example: 12 })
  totalBusinesses: number;

  @ApiProperty({ description: 'Date category was created', example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Last updated', example: '2024-12-10T14:20:00.000Z' })
  updatedAt: Date;
}

