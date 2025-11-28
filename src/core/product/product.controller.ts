import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PaginationDto } from '../../common/queries/dto';
import { HttpResponse } from '../../common/utils/http-response.utils';
import { JwtAuthGuard, UserRole } from '../users';
import { CreateProductDto, FindAllProductsDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductService } from './product.service';
import { RequestWithUser } from '../../common/interfaces';

@ApiTags('products')
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productService: ProductService) { }

  // ============================================
  // POST ROUTES
  // ============================================

  @Post()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new product',
    description:
      'Creates a new product with optional variations (sizes/colors). Requires authentication. The authenticated user (merchant) will be set as the product owner.',
  })
  @ApiBody({
    type: CreateProductDto,
    description:
      'Product data including name, description, price, business ID, category, and optional variations',
    examples: {
      basic: {
        summary: 'Basic product without variations',
        value: {
          name: 'Wireless Mouse',
          description: 'Ergonomic wireless mouse with USB receiver',
          price: 29.99,
          quantityInStock: 50,
          businessId: 1,
          category: 'Electronics',
          hasVariation: false,
          images: ['https://example.com/mouse.jpg'],
        },
      },
      withVariations: {
        summary: 'Product with size and color variations',
        value: {
          name: 'Cotton T-Shirt',
          description: 'Premium quality cotton t-shirt',
          price: 19.99,
          quantityInStock: 100,
          businessId: 1,
          category: 'Clothing',
          hasVariation: true,
          sizes: ['S', 'M', 'L', 'XL'],
          colors: ['Red', 'Blue', 'Black', 'White'],
          images: ['https://example.com/tshirt.jpg'],
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Product created successfully',
    schema: {
      example: {
        success: true,
        message: 'Product created successfully',
        data: {
          id: 1,
          name: 'Wireless Mouse',
          description: 'Ergonomic wireless mouse',
          price: 29.99,
          quantityInStock: 50,
          businessId: 1,
          categoryId: 5,
          hasVariation: false,
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-15T10:30:00Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - Invalid data (e.g., business not found, missing category, invalid variations)',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Valid JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Merchant can only create products for their own business',
  })
  async createProduct(@Request() req: RequestWithUser,
  , @Body() productData: CreateProductDto) {
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Verify the merchant owns the business they're creating a product for
    if (userRole === UserRole.MERCHANT) {
      await this.productService.verifyBusinessOwnership(userId, productData.businessId);
    }
    // Admins can create products for any business
    const product = await this.productService.createProduct(userId, productData);

    // Return sanitized product data (no sensitive user info)
    return HttpResponse.success({
      data: this.sanitizeProductData(product),
      message: 'Product created successfully',
    });
  }

  // ============================================
  // GET ROUTES - SPECIFIC PATHS FIRST
  // ============================================

  @Get('user')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get products for authenticated user',
    description:
      'Retrieves all products belonging to the currently authenticated merchant (extracted from JWT token). Merchants can only see their own products, admins can see all.',
  })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'User products retrieved successfully',
        data: [
          {
            id: 1,
            name: 'My Product',
            price: 49.99,
            quantityInStock: 20,
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Valid JWT token required',
  })
  async findProductsForCurrentUser(@Request() req: any) {
    const products = await this.productService.findProductsByUserId(req.user.userId);
    return HttpResponse.success({
      data: Array.isArray(products) ? products : products.data,
      message: 'User products retrieved successfully',
    });
  }

  @Get('business/:businessId')
  @Public()
  @ApiOperation({
    summary: 'Get products by business ID',
    description:
      'Retrieves all products belonging to a specific business with pagination and filtering support. This is a public endpoint that returns non-sensitive information.',
  })
  @ApiParam({
    name: 'businessId',
    required: true,
    type: Number,
    description: 'The ID of the business whose products to retrieve',
    example: 5,
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number', example: 1 })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
    example: 20,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term for filtering products',
    example: 'shoes',
  })
  @ApiQuery({
    name: 'minPrice',
    required: false,
    type: Number,
    description: 'Minimum price filter',
    example: 20,
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    type: Number,
    description: 'Maximum price filter',
    example: 200,
  })
  @ApiQuery({
    name: 'inStock',
    required: false,
    type: Boolean,
    description: 'Filter by stock availability',
    example: true,
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    type: Number,
    description: 'Filter by category',
    example: 3,
  })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Products for business 5 retrieved successfully',
        data: {
          data: [],
          meta: {
            page: 1,
            take: 20,
            itemCount: 15,
            pageCount: 1,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Business not found',
  })
  async findProductsByBusinessId(
    @Param('businessId', ParseIntPipe) businessId: number,
    @Query() query: FindAllProductsDto & PaginationDto,
  ) {
    query.businessId = businessId;
    const products = await this.productService.findAllProducts(query);

    // Sanitize product data for public endpoint
    const sanitizedData = {
      ...products,
      data: products.data.map((product) => this.sanitizeProductData(product)),
    };

    return HttpResponse.success({
      data: sanitizedData,
      message: `Products for business ${businessId} retrieved successfully`,
    });
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get all products with filtering',
    description:
      'Retrieves a paginated list of products with various filter options including search, price range, stock status, categories, and more. This is a public endpoint that returns non-sensitive product information.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, max: 100)',
    example: 10,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term for product name or description',
    example: 'wireless',
  })
  @ApiQuery({
    name: 'businessId',
    required: false,
    type: Number,
    description: 'Filter by business ID',
    example: 5,
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    type: Number,
    description: 'Filter by category ID',
    example: 2,
  })
  @ApiQuery({
    name: 'minPrice',
    required: false,
    type: Number,
    description: 'Minimum price filter',
    example: 10,
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    type: Number,
    description: 'Maximum price filter',
    example: 100,
  })
  @ApiQuery({
    name: 'inStock',
    required: false,
    type: Boolean,
    description: 'Filter by stock availability (true = in stock, false = out of stock)',
    example: true,
  })
  @ApiQuery({
    name: 'hasVariation',
    required: false,
    type: Boolean,
    description: 'Filter products with variations',
    example: true,
  })
  // @ApiQuery({ name: 'colors', required: false, type: [String], description: 'Filter by colors (comma-separated)', example: '#F0F0F0,#CCCCCC' })
  // @ApiQuery({ name: 'sizes', required: false, type: [String], description: 'Filter by sizes (comma-separated)', example: 'M,L,XL' })
  @ApiQuery({
    name: 'colors',
    required: false,
    // 💡 Explicit OpenAPI array definition
    schema: { type: 'array', items: { type: 'string' } },
    description: 'Filter by colors (comma-separated)',
    example: '#f0f0f0,#b1f2d2',
  })
  @ApiQuery({
    name: 'sizes',
    required: false,
    // 💡 Explicit OpenAPI array definition
    schema: { type: 'array', items: { type: 'string' } },
    description: 'Filter by sizes (comma-separated)',
    example: 'M,L,XL',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['id', 'name', 'price', 'quantityInStock', 'createdAt', 'updatedAt'],
    description: 'Sort field',
    example: 'createdAt',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
    example: 'DESC',
  })
  @ApiQuery({
    name: 'createdAfter',
    required: false,
    type: String,
    description: 'Filter products created after this date (ISO 8601)',
    example: '2024-01-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'createdBefore',
    required: false,
    type: String,
    description: 'Filter products created before this date (ISO 8601)',
    example: '2024-12-31T23:59:59Z',
  })
  @ApiQuery({
    name: 'updatedAfter',
    required: false,
    type: String,
    description: 'Filter products updated after this date',
    example: '2024-01-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'updatedBefore',
    required: false,
    type: String,
    description: 'Filter products updated before this date',
    example: '2024-12-31T23:59:59Z',
  })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Products retrieved successfully',
        data: {
          data: [
            {
              id: 1,
              name: 'Wireless Mouse',
              price: 29.99,
              quantityInStock: 50,
              businessId: 1,
              categoryId: 5,
            },
          ],
          meta: {
            page: 1,
            take: 10,
            itemCount: 45,
            pageCount: 5,
            hasPreviousPage: false,
            hasNextPage: true,
          },
        },
      },
    },
  })
  async findAllProducts(@Query() query: FindAllProductsDto & PaginationDto) {
    console.log({ query });
    const products = await this.productService.findAllProducts(query);

    // Sanitize product data for public endpoint
    const sanitizedData = {
      ...products,
      data: products.data.map((product) => this.sanitizeProductData(product)),
    };

    return HttpResponse.success({
      data: sanitizedData,
      message: 'Products retrieved successfully',
    });
  }

  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Get product by ID',
    description:
      'Retrieves detailed information about a specific product by its unique ID. This is a public endpoint that returns non-sensitive information only.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    type: Number,
    description: 'The unique identifier of the product',
    example: 42,
  })
  @ApiResponse({
    status: 200,
    description: 'Product retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Product retrieved successfully',
        data: {
          id: 42,
          name: 'Premium Headphones',
          description: 'Noise-cancelling wireless headphones',
          price: 199.99,
          quantityInStock: 25,
          businessId: 3,
          categoryId: 7,
          hasVariation: true,
          colors: ['Black', 'Silver'],
          sizes: [],
          images: ['https://example.com/headphones.jpg'],
          createdAt: '2024-01-10T08:00:00Z',
          updatedAt: '2024-01-15T14:30:00Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  async findProductById(@Param('id', ParseIntPipe) id: number) {
    const product = await this.productService.findProductById(id);

    // Sanitize product data for public endpoint
    return HttpResponse.success({
      data: this.sanitizeProductData(product),
      message: 'Product retrieved successfully',
    });
  }

  // ============================================
  // PATCH ROUTES
  // ============================================

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update product',
    description:
      'Updates an existing product by its ID. Only the product owner (merchant who created it) or admin users can update products. Merchants can only update products in their own business. All fields are optional - only provided fields will be updated.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    type: Number,
    description: 'Product ID to update',
    example: 42,
  })
  @ApiBody({
    type: UpdateProductDto,
    description: 'Product fields to update (all fields optional)',
    examples: {
      updatePrice: {
        summary: 'Update only price and stock',
        value: {
          price: 24.99,
          quantityInStock: 75,
        },
      },
      updateVariations: {
        summary: 'Update product variations',
        value: {
          hasVariation: true,
          sizes: ['S', 'M', 'L', 'XL', 'XXL'],
          colors: ['Navy', 'Gray', 'Black'],
        },
      },
      fullUpdate: {
        summary: 'Update multiple fields',
        value: {
          name: 'Updated Product Name',
          description: 'Updated description',
          price: 39.99,
          quantityInStock: 100,
          images: ['https://example.com/new-image.jpg'],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Product updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid update data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Valid JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Access denied: You can only update products you own (unless admin)',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  async updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: UpdateProductDto,
    @Request() req: any,
  ) {
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Get the product to check ownership
    const product = await this.productService.findProductById(id);

    // Authorization check: Only product owner or admin can update
    if (userRole !== UserRole.ADMIN && product.userId !== userId) {
      throw new ForbiddenException('Access denied: You can only update your own products');
    }

    // For merchants, verify they still own the business
    if (userRole === UserRole.MERCHANT) {
      await this.productService.verifyBusinessOwnership(userId, product.businessId);
    }

    const updatedProduct = await this.productService.updateProduct(id, updateData);

    return HttpResponse.success({
      data: this.sanitizeProductData(updatedProduct),
      message: 'Product updated successfully',
    });
  }

  // ============================================
  // DELETE ROUTES
  // ============================================

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete product',
    description:
      'Permanently deletes a product by its ID. Only the product owner (merchant who created it) or admin users can delete products. Merchants can only delete products in their own business. This action cannot be undone.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    type: Number,
    description: 'Product ID to delete',
    example: 42,
  })
  @ApiResponse({
    status: 200,
    description: 'Product deleted successfully',
    schema: {
      example: {
        success: true,
        message: 'Product deleted successfully',
        data: null,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Valid JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Access denied: You can only delete products you own (unless admin)',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  async deleteProduct(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Get the product to check ownership
    const product = await this.productService.findProductById(id);

    // Authorization check: Only product owner or admin can delete
    if (userRole !== UserRole.ADMIN && product.userId !== userId) {
      throw new ForbiddenException('Access denied: You can only delete your own products');
    }

    // For merchants, verify they still own the business
    if (userRole === UserRole.MERCHANT) {
      await this.productService.verifyBusinessOwnership(userId, product.businessId);
    }

    await this.productService.deleteProduct(id);

    return HttpResponse.success({
      data: null,
      message: 'Product deleted successfully',
    });
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Helper method to remove sensitive data from product objects
   * Use this for all public endpoints
   */
  private sanitizeProductData(product: any): any {
    if (!product) return product;

    const { user, userId, ...sanitizedProduct } = product;

    // Remove any other sensitive fields if they exist
    return sanitizedProduct;
  }
}
