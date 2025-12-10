import {
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Query
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { StoreFrontProductQueryDto } from './dto/store-front-query.dto';
import { StoreFrontService } from './store-front.service';

import {
  PaginatedProductsDto,
  PublicBusinessInfoDto,
  PublicProductDetailDto,
  StoreFrontCategoryDto
} from './dto/store-front-response.dto';

@ApiTags('store-front')
@Controller('store-front')
@Public()
export class StoreFrontController {
  constructor(private readonly storeFrontService: StoreFrontService) { }

  @Get(':businessId')
  @Public()
  @ApiOperation({
    summary: 'Get store information',
    description: 'Retrieves public information about a store/business. This endpoint returns only non-sensitive data suitable for public display.'
  })
  @ApiParam({
    name: 'businessId',
    type: Number,
    description: 'The ID of the business/store',
    example: 1
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Store information retrieved successfully',
    type: PublicBusinessInfoDto,
    schema: {
      example: {
        id: 1,
        businessName: 'TechStore Inc.',
        businessDescription: 'Premium electronics and gadgets store',
        location: 'Lagos, Nigeria',
        logo: 'https://cloudinary.com/qkly/logo.jpg',
        businessType: {
          id: 1,
          name: 'Electronics'
        },
        createdAt: '2024-01-15T10:30:00Z'
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Store not found'
  })
  async getStoreInfo(
    @Param('businessId', ParseIntPipe) businessId: number
  ): Promise<PublicBusinessInfoDto> {
    return this.storeFrontService.getStoreInfo(businessId);
  }

  @Get(':businessId/products')
  @Public()
  @ApiOperation({
    summary: 'Get all products for a store',
    description: 'Retrieves a paginated list of in-stock products for a specific store with filtering options. Only returns products that are currently in stock.'
  })
  @ApiParam({
    name: 'businessId',
    type: Number,
    description: 'The ID of the business/store',
    example: 1
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20)',
    example: 20
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    type: Number,
    description: 'Filter by category ID',
    example: 5
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search in product name or description',
    example: 'wireless'
  })
  @ApiQuery({
    name: 'minPrice',
    required: false,
    type: Number,
    description: 'Minimum price filter',
    example: 10
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    type: Number,
    description: 'Maximum price filter',
    example: 1000
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['name', 'price', 'createdAt'],
    description: 'Sort field (default: createdAt)',
    example: 'price'
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order (default: DESC)',
    example: 'ASC'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Products retrieved successfully',
    type: PaginatedProductsDto
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Store not found'
  })
  async getStoreProducts(
    @Param('businessId', ParseIntPipe) businessId: number,
    @Query() query: StoreFrontProductQueryDto
  ) {
    return this.storeFrontService.getStoreProducts(businessId, query);
  }

  @Get(':businessId/products/:productId')
  @ApiOperation({
    summary: 'Get product details',
    description: 'Retrieves detailed information about a specific product including business information. Only returns public, non-sensitive data.'
  })
  @ApiParam({
    name: 'businessId',
    type: Number,
    description: 'The ID of the business/store',
    example: 1
  })
  @ApiParam({
    name: 'productId',
    type: Number,
    description: 'The ID of the product',
    example: 42
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product details retrieved successfully',
    type: PublicProductDetailDto,
    schema: {
      example: {
        id: 42,
        name: 'Wireless Headphones',
        description: 'Premium noise-cancelling wireless headphones',
        price: 199.99,
        quantityInStock: 25,
        hasVariation: true,
        colors: ['Black', 'Silver', 'Blue'],
        sizes: [],
        images: ['https://example.com/headphones1.jpg', 'https://example.com/headphones2.jpg'],
        category: {
          id: 5,
          name: 'Electronics'
        },
        business: {
          id: 1,
          businessName: 'TechStore Inc.',
          logo: 'https://cloudinary.com/logo.jpg'
        },
        createdAt: '2024-01-10T08:00:00Z'
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product or store not found'
  })
  async getProductDetail(
    @Param('businessId', ParseIntPipe) businessId: number,
    @Param('productId', ParseIntPipe) productId: number
  ): Promise<PublicProductDetailDto> {
    return this.storeFrontService.getProductDetail(businessId, productId);
  }

  @Get(':businessId/categories')
  @ApiOperation({
    summary: 'Get all categories for a store',
    description: 'Retrieves all product categories that have in-stock products in this store, including the count of products in each category.'
  })
  @ApiParam({
    name: 'businessId',
    type: Number,
    description: 'The ID of the business/store',
    example: 1
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Categories retrieved successfully',
    type: [StoreFrontCategoryDto],
    schema: {
      example: [
        {
          id: 1,
          name: 'Electronics',
          productCount: 45
        },
        {
          id: 2,
          name: 'Accessories',
          productCount: 23
        },
        {
          id: 3,
          name: 'Audio',
          productCount: 12
        }
      ]
    }
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Store not found'
  })
  async getStoreCategories(
    @Param('businessId', ParseIntPipe) businessId: number
  ): Promise<StoreFrontCategoryDto[]> {
    return this.storeFrontService.getStoreCategories(businessId);
  }

  @Get(':businessId/categories/:categoryId/products')
  @ApiOperation({
    summary: 'Get products by category',
    description: 'Retrieves all in-stock products in a specific category for a store with pagination and additional filtering options.'
  })
  @ApiParam({
    name: 'businessId',
    type: Number,
    description: 'The ID of the business/store',
    example: 1
  })
  @ApiParam({
    name: 'categoryId',
    type: Number,
    description: 'The ID of the category',
    example: 5
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20)',
    example: 20
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search in product name or description',
    example: 'wireless'
  })
  @ApiQuery({
    name: 'minPrice',
    required: false,
    type: Number,
    description: 'Minimum price filter',
    example: 10
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    type: Number,
    description: 'Maximum price filter',
    example: 500
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['name', 'price', 'createdAt'],
    description: 'Sort field (default: createdAt)',
    example: 'price'
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order (default: DESC)',
    example: 'ASC'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Products retrieved successfully',
    type: PaginatedProductsDto
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Store or category not found'
  })
  async getProductsByCategory(
    @Param('businessId', ParseIntPipe) businessId: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Query() query: StoreFrontProductQueryDto
  ) {
    return this.storeFrontService.getProductsByCategory(
      businessId,
      categoryId,
      query
    );
  }
}