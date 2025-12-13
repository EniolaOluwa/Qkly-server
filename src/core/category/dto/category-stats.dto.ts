import { ApiProperty } from '@nestjs/swagger';

export class CategoryStatsDto {
  @ApiProperty({
    description: 'Total number of categories',
    example: 28,
  })
  totalCategories: number;

  @ApiProperty({
    description: 'Number of categories created this month',
    example: 5,
  })
  newCategoriesThisMonth: number;

  @ApiProperty({
    description: 'Total number of products across all categories',
    example: 3420,
  })
  totalProducts: number;
}
