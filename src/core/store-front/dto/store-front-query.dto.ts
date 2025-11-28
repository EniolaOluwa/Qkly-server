import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, IsString, IsNumber } from 'class-validator';

export class StoreFrontProductQueryDto {
  @ApiProperty({
    description: 'Page number for pagination',
    required: false,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    required: false,
    default: 20,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiProperty({
    description: 'Category ID to filter products',
    required: false,
    example: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @ApiProperty({
    description: 'Search term for product name or description',
    required: false,
    example: 'wireless',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Minimum price filter',
    required: false,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @ApiProperty({
    description: 'Maximum price filter',
    required: false,
    example: 1000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @ApiProperty({
    description: 'Sort field (name, price, createdAt)',
    required: false,
    enum: ['name', 'price', 'createdAt'],
    default: 'createdAt',
    example: 'price',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiProperty({
    description: 'Sort order',
    required: false,
    enum: ['ASC', 'DESC'],
    default: 'DESC',
    example: 'ASC',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
