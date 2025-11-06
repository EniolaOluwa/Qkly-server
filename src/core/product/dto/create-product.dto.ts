import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
  Min,
  Matches,
  IsEnum,
  IsIn,
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
    description: 'User ID who owns the product',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  
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
  @IsString({ each: true})
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
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

}





// export class FindAllProductsDto {
//   page?: number;
//   limit?: number;
//   userId?: number;
//   businessId?: number;
//   categoryId?: number;
//   search?: string;     // optional keyword search
//   sortBy?: string;     // e.g. 'price' or 'createdAt'
//   sortOrder?: 'ASC' | 'DESC';
// }


export class FindAllProductsDto {
  @ApiPropertyOptional({ description: 'Page number', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of items per page', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Filter by user ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  userId?: number;

  @ApiPropertyOptional({ description: 'Filter by business ID', example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  businessId?: number;

  @ApiPropertyOptional({ description: 'Filter by category ID', example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  categoryId?: number;

  @ApiPropertyOptional({ description: 'Search keyword for product name or description', example: 'Nike' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Sort by a specific field', example: 'price' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sorting order (ASC or DESC)', example: 'ASC' })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}