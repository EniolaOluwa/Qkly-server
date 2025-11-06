import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Category name',
    example: 'T-Shirts',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Parent category ID (for hierarchical categories)',
    example: 1,
  })
  @IsOptional()
  parentId?: number;
}
