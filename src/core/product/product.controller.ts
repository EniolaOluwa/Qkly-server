import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
  UseGuards,
  Request,
  SetMetadata,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ProductService } from './product.service';
import { Product } from './entity/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);




@ApiTags('products')
@Controller('products')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProductsController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createProduct(@Body() productData: CreateProductDto): Promise<Product> {
    return await this.productService.createProduct(productData);
  }

  @Get()
  async findAllProducts(): Promise<Product[]> {
    return await this.productService.findAllProducts();
  }

  @Get('my-business-products')
  @ApiOperation({
    summary: "Get products for authenticated user's businesses",
    description:
      'Retrieves all products that belong to businesses owned by the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
  })
  async findProductsForMyBusinesses(@Request() req: any): Promise<Product[]> {
    return await this.productService.findProductsByUserId(req.user.userId);
  }

  @Get('user')
  @ApiOperation({
    summary: 'Get products for authenticated user',
    description:
      'Retrieves products for the authenticated user using JWT token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
  })
  async findProductsForCurrentUser(@Request() req: any): Promise<Product[]> {
    return await this.productService.findProductsByUserId(req.user.userId);
  }

  @Get('user/:userId')
  @ApiOperation({
    summary: 'Get products by user ID',
    description: 'Retrieves products for a specific user.',
  })
  @ApiParam({
    name: 'userId',
    required: true,
    description: 'User ID to get products for.',
  })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
  })
  async findProductsByUserId(
    @Param('userId') userId: string,
  ): Promise<Product[]> {
    const targetUserId = parseInt(userId, 10);
    return await this.productService.findProductsByUserId(targetUserId);
  }

  @Get('business/:businessId')
  @ApiOperation({
    summary: 'Get products by business ID',
    description: 'Retrieves products for a specific business.',
  })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
  })
  async findProductsByBusinessId(
    @Param('businessId', ParseIntPipe) businessId: number,
  ): Promise<Product[]> {
    return await this.productService.findProductsByBusinessId(businessId);
  }

  @Get(':id')
  async findProductById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Product> {
    return await this.productService.findProductById(id);
  }

  @Patch(':id')
  async updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: UpdateProductDto,
  ): Promise<Product> {
    return await this.productService.updateProduct(id, updateData);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProduct(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return await this.productService.deleteProduct(id);
  }
}