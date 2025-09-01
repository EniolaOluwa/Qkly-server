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
import { StoreService } from './store.service';
import { Order, OrderStatus, TransactionStatus } from './order.entity';
import { Product } from './product.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { Review } from './review.entity';
import { JwtAuthGuard } from '../users/jwt-auth.guard';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly storeService: StoreService) {}

  // Order endpoints
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrder(@Body() orderData: CreateOrderDto): Promise<Order> {
    return await this.storeService.createOrder(orderData);
  }

  @Get()
  async findAllOrders(): Promise<Order[]> {
    return await this.storeService.findAllOrders();
  }

  @Get('my-business-orders')
  @ApiOperation({
    summary: "Get orders for authenticated user's businesses",
    description:
      'Retrieves all orders that belong to businesses owned by the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Orders retrieved successfully',
  })
  async findOrdersForMyBusinesses(@Request() req: any): Promise<Order[]> {
    return await this.storeService.findOrdersByUserId(req.user.userId);
  }

  @Get('user')
  @ApiOperation({
    summary: 'Get orders for authenticated user',
    description:
      'Retrieves orders for the authenticated user using JWT token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Orders retrieved successfully',
  })
  async findOrdersForCurrentUser(@Request() req: any): Promise<Order[]> {
    return await this.storeService.findOrdersByUserId(req.user.userId);
  }

  @Get('user/:userId')
  @ApiOperation({
    summary: 'Get orders by user ID',
    description: 'Retrieves orders for a specific user.',
  })
  @ApiParam({
    name: 'userId',
    required: true,
    description: 'User ID to get orders for.',
  })
  @ApiResponse({
    status: 200,
    description: 'Orders retrieved successfully',
  })
  async findOrdersByUserId(
    @Param('userId') userId: string,
  ): Promise<Order[]> {
    const targetUserId = parseInt(userId, 10);
    return await this.storeService.findOrdersByUserId(targetUserId);
  }

  @Get('business/:businessId')
  @ApiOperation({
    summary: 'Get orders by business ID',
    description: 'Retrieves orders for a specific business.',
  })
  @ApiResponse({
    status: 200,
    description: 'Orders retrieved successfully',
  })
  async findOrdersByBusinessId(
    @Param('businessId', ParseIntPipe) businessId: number,
  ): Promise<Order[]> {
    return await this.storeService.findOrdersByBusinessId(businessId);
  }

  @Get(':id')
  async findOrderById(@Param('id', ParseIntPipe) id: number): Promise<Order> {
    return await this.storeService.findOrderById(id);
  }

  @Patch(':id/status')
  async updateOrderStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('orderStatus') orderStatus: OrderStatus,
  ): Promise<Order> {
    return await this.storeService.updateOrderStatus(id, orderStatus);
  }

  @Patch(':id/transaction-status')
  async updateTransactionStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('transactionStatus') transactionStatus: TransactionStatus,
  ): Promise<Order> {
    return await this.storeService.updateTransactionStatus(
      id,
      transactionStatus,
    );
  }

  @Patch(':id')
  async updateOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: UpdateOrderDto,
  ): Promise<Order> {
    return await this.storeService.updateOrder(id, updateData);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOrder(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return await this.storeService.deleteOrder(id);
  }
}

@ApiTags('products')
@Controller('products')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProductsController {
  constructor(private readonly storeService: StoreService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createProduct(@Body() productData: CreateProductDto): Promise<Product> {
    return await this.storeService.createProduct(productData);
  }

  @Get()
  async findAllProducts(): Promise<Product[]> {
    return await this.storeService.findAllProducts();
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
    return await this.storeService.findProductsByUserId(req.user.userId);
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
    return await this.storeService.findProductsByUserId(req.user.userId);
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
    return await this.storeService.findProductsByUserId(targetUserId);
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
    return await this.storeService.findProductsByBusinessId(businessId);
  }

  @Get(':id')
  async findProductById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Product> {
    return await this.storeService.findProductById(id);
  }

  @Patch(':id')
  async updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: UpdateProductDto,
  ): Promise<Product> {
    return await this.storeService.updateProduct(id, updateData);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProduct(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return await this.storeService.deleteProduct(id);
  }
}

@ApiTags('store')
@Controller('store')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Public()
  @Post('product/review')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a product review',
    description: 'Create a review for a product. The order must be delivered to allow review creation. Only one review per order is allowed.',
  })
  @ApiResponse({
    status: 201,
    description: 'Review created successfully',
    type: Review,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Order not delivered, review already exists for this order, or validation errors',
  })
  @ApiResponse({
    status: 404,
    description: 'Order or product not found',
  })
  async createReview(@Body() reviewData: CreateReviewDto): Promise<Review> {
    return await this.storeService.createReview(reviewData);
  }

  @Get('product/review/:productId')
  @ApiOperation({
    summary: 'Get reviews for a product',
    description: 'Retrieve all reviews for a specific product.',
  })
  @ApiParam({
    name: 'productId',
    required: true,
    description: 'Product ID to get reviews for.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reviews retrieved successfully',
    type: [Review],
  })
  async getProductReviews(
    @Param('productId', ParseIntPipe) productId: number,
  ): Promise<Review[]> {
    return await this.storeService.findReviewsByProductId(productId);
  }

  @Get('business/review/:businessId')
  @ApiOperation({
    summary: 'Get reviews for a business',
    description: 'Retrieve all reviews for a specific business.',
  })
  @ApiParam({
    name: 'businessId',
    required: true,
    description: 'Business ID to get reviews for.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reviews retrieved successfully',
    type: [Review],
  })
  async getBusinessReviews(
    @Param('businessId', ParseIntPipe) businessId: number,
  ): Promise<Review[]> {
    return await this.storeService.findReviewsByBusinessId(businessId);
  }

  @Get('product/review/:id')
  @ApiOperation({
    summary: 'Get a specific review by ID',
    description: 'Retrieve a specific review by its ID.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Review ID to retrieve.',
  })
  @ApiResponse({
    status: 200,
    description: 'Review retrieved successfully',
    type: Review,
  })
  @ApiResponse({
    status: 404,
    description: 'Review not found',
  })
  async getReviewById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Review> {
    return await this.storeService.findReviewById(id);
  }
}
