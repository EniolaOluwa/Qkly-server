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
import { OrderService } from './order.service';
import { CreateOrderDto } from '../order/dto/create-order.dto';
import { UpdateOrderDto } from '../order/dto/update-order.dto';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Order } from './entity/order.entity';
import { OrderStatus, TransactionStatus } from './interfaces/order.interface';


export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);


@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly orderService: OrderService) {}

  // Order endpoints
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrder(@Body() orderData: CreateOrderDto): Promise<Order> {
    return await this.orderService.createOrder(orderData);
  }

  @Get()
  async findAllOrders(): Promise<Order[]> {
    return await this.orderService.findAllOrders();
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
    return await this.orderService.findOrdersByUserId(req.user.userId);
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
    return await this.orderService.findOrdersByUserId(req.user.userId);
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
    return await this.orderService.findOrdersByUserId(targetUserId);
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
    return await this.orderService.findOrdersByBusinessId(businessId);
  }

  @Get(':id')
  async findOrderById(@Param('id', ParseIntPipe) id: number): Promise<Order> {
    return await this.orderService.findOrderById(id);
  }

  @Patch(':id/status')
  async updateOrderStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('orderStatus') orderStatus: OrderStatus,
  ): Promise<Order> {
    return await this.orderService.updateOrderStatus(id, orderStatus);
  }

  @Patch(':id/transaction-status')
  async updateTransactionStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('transactionStatus') transactionStatus: TransactionStatus,
  ): Promise<Order> {
    return await this.orderService.updateTransactionStatus(
      id,
      transactionStatus,
    );
  }

  @Patch(':id')
  async updateOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: UpdateOrderDto,
  ): Promise<Order> {
    return await this.orderService.updateOrder(id, updateData);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOrder(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return await this.orderService.deleteOrder(id);
  }
}