import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsNumber, IsEnum, IsDateString, IsBoolean } from 'class-validator';
import { PaginationDto } from '../../../common/queries/dto';
import { DateFilterEnum } from '../enums/admin-filter.enum';

export enum StockStatusEnum {
  IN_STOCK = 'IN_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  LOW_STOCK = 'LOW_STOCK',
}

export enum ProductSortByEnum {
  NAME = 'name',
  PRICE = 'price',
  QUANTITY = 'quantityInStock',
  CREATED_AT = 'createdAt',
  TOTAL_SALES = 'totalSales',
}

export class ProductFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Search by product name or description',
    example: 'shirt',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by category ID',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  categoryId?: number;

  @ApiPropertyOptional({
    description: 'Filter by business ID',
    example: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  businessId?: number;

  @ApiPropertyOptional({
    description: 'Filter by user/merchant ID',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  userId?: number;

  @ApiPropertyOptional({
    description: 'Filter by stock status',
    enum: StockStatusEnum,
    example: StockStatusEnum.IN_STOCK,
  })
  @IsOptional()
  @IsEnum(StockStatusEnum)
  stockStatus?: StockStatusEnum;

  @ApiPropertyOptional({
    description: 'Filter by product creation date period',
    enum: DateFilterEnum,
    example: DateFilterEnum.THIS_MONTH,
  })
  @IsOptional()
  @IsEnum(DateFilterEnum)
  dateFilter?: DateFilterEnum;

  @ApiPropertyOptional({
    description: 'Custom start date (required if dateFilter is CUSTOM)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  customStartDate?: string;

  @ApiPropertyOptional({
    description: 'Custom end date (required if dateFilter is CUSTOM)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  customEndDate?: string;

  @ApiPropertyOptional({
    description: 'Minimum price',
    example: 1000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Maximum price',
    example: 50000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Minimum quantity in stock',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minQuantity?: number;

  @ApiPropertyOptional({
    description: 'Maximum quantity in stock',
    example: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxQuantity?: number;

  @ApiPropertyOptional({
    description: 'Filter by whether product has variations (size/color)',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasVariation?: boolean;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: ProductSortByEnum,
    example: ProductSortByEnum.CREATED_AT,
    default: ProductSortByEnum.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(ProductSortByEnum)
  sortBy?: ProductSortByEnum;
}
