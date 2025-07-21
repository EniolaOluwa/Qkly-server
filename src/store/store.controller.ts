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
import { JwtAuthGuard } from '../users/jwt-auth.guard';

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

  @Get('user/:userId?')
  @ApiOperation({
    summary: 'Get orders by user ID',
    description:
      'Retrieves orders for a specific user. If userId is not provided in route, uses authenticated user ID from JWT token.',
  })
  @ApiParam({
    name: 'userId',
    required: false,
    description:
      'User ID to get orders for. If not provided, uses authenticated user ID.',
  })
  @ApiResponse({
    status: 200,
    description: 'Orders retrieved successfully',
  })
  async findOrdersByUserId(
    @Param('userId') userId?: string,
    @Request() req?: any,
  ): Promise<Order[]> {
    const targetUserId = userId ? parseInt(userId, 10) : req?.user?.userId;
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

  @Get('user/:userId?')
  @ApiOperation({
    summary: 'Get products by user ID',
    description:
      'Retrieves products for a specific user. If userId is not provided in route, uses authenticated user ID from JWT token.',
  })
  @ApiParam({
    name: 'userId',
    required: false,
    description:
      'User ID to get products for. If not provided, uses authenticated user ID.',
  })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
  })
  async findProductsByUserId(
    @Param('userId') userId?: string,
    @Request() req?: any,
  ): Promise<Product[]> {
    const targetUserId = userId ? parseInt(userId, 10) : req?.user?.userId;
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
