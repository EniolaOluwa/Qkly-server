import { ApiProperty } from '@nestjs/swagger';
import { ProductSize } from '../../product/entity/productSize.entity';

export class PublicBusinessInfoDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'TechStore Inc.' })
  businessName: string;

  @ApiProperty({ example: 'Premium electronics and gadgets' })
  businessDescription: string;

  @ApiProperty({ example: 'Lagos, Nigeria' })
  location: string;

  @ApiProperty({ example: 'https://cloudinary.com/logo.jpg' })
  logo: string;

  @ApiProperty({
    example: { id: 1, name: 'Electronics' },
    description: 'Business type information',
  })
  businessType: {
    id: number;
    name: string;
  };

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt: Date;
}

export class PublicProductDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Wireless Mouse' })
  name: string;

  @ApiProperty({ example: 'Ergonomic wireless mouse with USB receiver' })
  description: string;

  @ApiProperty({ example: 29.99 })
  price: number;

  @ApiProperty({ example: 50 })
  quantityInStock: number;

  @ApiProperty({ example: true })
  hasVariation: boolean;

  @ApiProperty({ example: ['Red', 'Blue', 'Black'], required: false })
  colors?: string[];

  @ApiProperty({ example: ['S', 'M', 'L'], required: false })
  sizes: ProductSize[];

  @ApiProperty({ example: ['https://example.com/image1.jpg'] })
  images: string[];

  @ApiProperty({
    example: { id: 5, name: 'Electronics' },
    description: 'Product category',
  })
  category: {
    id: number;
    name: string;
  };

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt: Date;
}

export class PublicProductDetailDto extends PublicProductDto {
  @ApiProperty({
    example: {
      id: 1,
      businessName: 'TechStore Inc.',
      logo: 'https://cloudinary.com/logo.jpg',
    },
    description: 'Basic business information',
  })
  business: {
    id: number;
    businessName: string;
    logo: string;
  };
}

export class StoreFrontCategoryDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Electronics' })
  name: string;

  @ApiProperty({ example: 25, description: 'Number of products in this category for this store' })
  productCount: number;
}

export class PaginatedProductsDto {
  @ApiProperty({ type: [PublicProductDto] })
  data: PublicProductDto[];

  @ApiProperty({
    example: {
      page: 1,
      limit: 20,
      totalItems: 100,
      totalPages: 5,
      hasNextPage: true,
      hasPreviousPage: false,
    },
  })
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export class StoreFrontResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  businessId: number;

  @ApiProperty({ example: 'https://cloudinary.com/cover.jpg' })
  coverImage: string;

  @ApiProperty({ example: "Success's Clothings" })
  storeName: string;

  @ApiProperty({ example: 'Welcome to our store!' })
  heroText: string;

  @ApiProperty({ example: '#FF0000' })
  storeColor: string;

  @ApiProperty({ example: ['Joggers', 'Dress'], required: false })
  categoryName?: string[];

  @ApiProperty({
    example: ['https://cloudinary.com/cat1.jpg', 'https://cloudinary.com/cat2.jpg'],
    required: false,
  })
  categoryImage?: string[];

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  updatedAt: Date;
}
