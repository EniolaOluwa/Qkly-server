import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards
} from '@nestjs/common';
import {
  ApiBearerAuth,
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


@ApiTags('products')
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productService: ProductService) { }

  @Post()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new product',
    description: 'Creates a new product. Requires authentication.'
  })
  @ApiResponse({
    status: 201,
    description: 'Product created successfully'
  })
  async createProduct(@Request() req, @Body() productData: CreateProductDto) {

    const userId = req.user.userId;

    console.log({ userId, user: req.user })
    const product = await this.productService.createProduct(userId, productData);
    return HttpResponse.success({
      data: product,
      message: 'Product created successfully'
    });
  }

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Get all products with filtering',
    description: 'Retrieves products with various filter options and pagination. Public endpoint.'
  })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully'
  })
  async findAllProducts(@Query() query: FindAllProductsDto & PaginationDto) {
    const products = await this.productService.findAllProducts(query);
    return HttpResponse.success({
      data: products,
      message: 'Products retrieved successfully'
    });
  }


  @Get('user')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get products for authenticated user',
    description: 'Retrieves products for the authenticated user using JWT token.'
  })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully'
  })
  async findProductsForCurrentUser(@Request() req: any) {
    const products = await this.productService.findProductsByUserId(req.user.userId);
    return HttpResponse.success({
      data: products,
      message: 'User products retrieved successfully'
    });
  }

  @Get('user/:userId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get products by user ID',
    description: 'Retrieves products for a specific user. Admin access required for other users.'
  })
  @ApiParam({
    name: 'userId',
    required: true,
    description: 'User ID to get products for.'
  })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully'
  })
  async findProductsByUserId(
    @Param('userId') userId: string,
    @Request() req: any
  ) {
    const targetUserId = parseInt(userId, 10);

    // Only allow users to access their own products unless they are admins
    if (req.user.userId !== targetUserId && req.user.role !== UserRole.ADMIN) {
      return HttpResponse.error({
        data: null,
        message: 'Access denied: You can only view your own products'
      });
    }

    const products = await this.productService.findProductsByUserId(targetUserId);
    return HttpResponse.success({
      data: products,
      message: `Products for user ${targetUserId} retrieved successfully`
    });
  }

  @Get('business/:businessId')
  @Public()
  @ApiOperation({
    summary: 'Get products by business ID',
    description: 'Retrieves products for a specific business. Public endpoint.'
  })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully'
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number'
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page'
  })
  async findProductsByBusinessId(
    @Param('businessId', ParseIntPipe) businessId: number,
    @Query() query: FindAllProductsDto & PaginationDto
  ) {
    // Set the businessId in the query
    query.businessId = businessId;

    // Use the findAllProducts method to get filtered and paginated results
    const products = await this.productService.findAllProducts(query);

    return HttpResponse.success({
      data: products,
      message: `Products for business ${businessId} retrieved successfully`
    });
  }

  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Get product by ID',
    description: 'Retrieves a specific product by its ID. Public endpoint.'
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Product ID'
  })
  @ApiResponse({
    status: 200,
    description: 'Product retrieved successfully'
  })
  async findProductById(@Param('id', ParseIntPipe) id: number) {
    const product = await this.productService.findProductById(id);
    return HttpResponse.success({
      data: product,
      message: 'Product retrieved successfully'
    });
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update product',
    description: 'Updates a product by its ID. Only product owners or admins can update.'
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Product ID'
  })
  @ApiResponse({
    status: 200,
    description: 'Product updated successfully'
  })
  @ApiBearerAuth()
  async updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: UpdateProductDto,
    @Request() req: any
  ) {
    // Get the product to check ownership
    const product = await this.productService.findProductById(id);

    // Only allow updates from the product owner or admins
    if (product.userId !== req.user.userId && req.user.role !== UserRole.ADMIN) {
      return HttpResponse.error({
        data: null,
        message: 'Access denied: You can only update your own products'
      });
    }

    const updatedProduct = await this.productService.updateProduct(id, updateData);
    return HttpResponse.success({
      data: updatedProduct,
      message: 'Product updated successfully'
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete product',
    description: 'Deletes a product by its ID. Only product owners or admins can delete.'
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Product ID'
  })
  @ApiResponse({
    status: 200,
    description: 'Product deleted successfully'
  })
  @ApiBearerAuth()
  async deleteProduct(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any
  ) {
    // Get the product to check ownership
    const product = await this.productService.findProductById(id);

    // Only allow deletion from the product owner or admins
    if (product.userId !== req.user.userId && req.user.role !== UserRole.ADMIN) {
      return HttpResponse.error({
        data: null,
        message: 'Access denied: You can only delete your own products'
      });
    }

    await this.productService.deleteProduct(id);
    return HttpResponse.success({
      data: null,
      message: 'Product deleted successfully'
    });
  }

  @Get('search')
  @Public()
  @ApiOperation({
    summary: 'Advanced product search',
    description: 'Search and filter products using multiple criteria. Public endpoint.'
  })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully'
  })
  async searchProducts(@Query() query: FindAllProductsDto & PaginationDto) {
    const products = await this.productService.findAllProducts(query);
    return HttpResponse.success({
      data: products,
      message: 'Products search results retrieved successfully'
    });
  }
}