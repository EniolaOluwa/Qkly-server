import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
  Min,
  Matches,
  IsEnum,
  IsBoolean,
  Max,
} from 'class-validator';


export enum MeasurementType {
  SIZE = 'SIZE',
  LABEL = 'LABEL',
}


/**
 * DTO for product sizes
 */
export class SizeDto {
  @ApiProperty({
    description: 'Type of measurement (size or label)',
    enum: MeasurementType,
    example: MeasurementType.SIZE,
  })
  @IsEnum(MeasurementType)
  measurement: MeasurementType;

  @ApiProperty({
    description: 'List of size values',
    example: ['S', 'M', 'L', 'XL'],
  })
  @IsArray()
  @IsString({ each: true })
  value: string[];
}



export class CreateProductDto {
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
  @IsArray()
  @IsString({ each: true })
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    each: true,
    message: 'Color must be a valid hex color code (e.g., #FF5733)',
  })
  colors?: string[];


  @ApiProperty({
    description: 'Indicates if product has size or color variations',
    example: true,
    required: false,
  })
  @IsOptional()
  hasVariation?: boolean;


  @ApiProperty({
    description: 'Product title',
    example: 'Premium Cotton T-Shirt',
  })
  @IsString()
  @IsNotEmpty()
  name: string;


  @ApiProperty({
    description: 'Product description',
    example: 'High-quality cotton t-shirt with premium finish',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;


  @ApiProperty({
    description: 'Quantity in stock',
    example: 100,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  quantityInStock?: number;


  @ApiProperty({
    description: 'Product price',
    example: 29.99,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0, { message: 'Price must be a positive number' })
  price: number;


  @ApiProperty({
    description: 'List of size or label variations',
    type: [SizeDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  sizes?: SizeDto[];



  @ApiPropertyOptional({
    description: 'Product category name (text). Will be created if it does not exist.',
    example: 'T-Shirts',
  })
  @IsString()
  category: string;
}






export class FindAllProductsDto {
  @ApiPropertyOptional({
    description: 'Page number',
    type: Number,
    default: 1
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    type: Number,
    default: 10
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by user ID',
    type: Number
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  userId?: number;

  @ApiPropertyOptional({
    description: 'Filter by business ID',
    type: Number
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  businessId?: number;

  @ApiPropertyOptional({
    description: 'Filter by category ID',
    type: Number
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  categoryId?: number;

  @ApiPropertyOptional({
    description: 'Search in product name and description',
    type: String
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: ['id', 'name', 'price', 'quantityInStock', 'createdAt', 'updatedAt'],
    default: 'createdAt'
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    default: 'DESC'
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional({
    description: 'Minimum price',
    type: Number
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Maximum price',
    type: Number
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Filter by stock availability',
    type: Boolean
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  inStock?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by variation status',
    type: Boolean
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  hasVariation?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by colors',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  colors?: string[];

  @ApiPropertyOptional({
    description: 'Filter by sizes',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sizes?: string[];

  @ApiPropertyOptional({
    description: 'Filter products created after this date',
    type: String,
    example: '2023-01-01'
  })
  @IsOptional()
  @Type(() => Date)
  createdAfter?: Date;

  @ApiPropertyOptional({
    description: 'Filter products created before this date',
    type: String,
    example: '2023-12-31'
  })
  @IsOptional()
  @Type(() => Date)
  createdBefore?: Date;

  @ApiPropertyOptional({
    description: 'Filter products updated after this date',
    type: String,
    example: '2023-01-01'
  })
  @IsOptional()
  @Type(() => Date)
  updatedAfter?: Date;

  @ApiPropertyOptional({
    description: 'Filter products updated before this date',
    type: String,
    example: '2023-12-31'
  })
  @IsOptional()
  @Type(() => Date)
  updatedBefore?: Date;
}