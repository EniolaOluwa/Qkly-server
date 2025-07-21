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
} from '@nestjs/common';
import { StoreService } from './store.service';
import { Order, OrderStatus, TransactionStatus } from './order.entity';
import { Product } from './product.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('orders')
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

  @Get(':id')
  async findOrderById(@Param('id', ParseIntPipe) id: number): Promise<Order> {
    return await this.storeService.findOrderById(id);
  }

  @Get('user/:userId')
  async findOrdersByUserId(@Param('userId', ParseIntPipe) userId: number): Promise<Order[]> {
    return await this.storeService.findOrdersByUserId(userId);
  }

  @Get('business/:businessId')
  async findOrdersByBusinessId(@Param('businessId', ParseIntPipe) businessId: number): Promise<Order[]> {
    return await this.storeService.findOrdersByBusinessId(businessId);
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
    return await this.storeService.updateTransactionStatus(id, transactionStatus);
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

@Controller('products')
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

  @Get(':id')
  async findProductById(@Param('id', ParseIntPipe) id: number): Promise<Product> {
    return await this.storeService.findProductById(id);
  }

  @Get('user/:userId')
  async findProductsByUserId(@Param('userId', ParseIntPipe) userId: number): Promise<Product[]> {
    return await this.storeService.findProductsByUserId(userId);
  }

  @Get('business/:businessId')
  async findProductsByBusinessId(@Param('businessId', ParseIntPipe) businessId: number): Promise<Product[]> {
    return await this.storeService.findProductsByBusinessId(businessId);
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