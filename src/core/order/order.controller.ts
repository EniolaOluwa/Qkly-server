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
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';

import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { FindAllOrdersDto, UpdateOrderItemStatusDto, UpdateOrderStatusDto } from './dto/filter-order.dot';
import { InitiatePaymentDto, PaymentCallbackDto, ProcessPaymentDto, VerifyPaymentDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Order } from './entity/order.entity';
import { OrderItem } from './entity/order-items.entity';
import { OrderStatus, PaymentStatus } from './interfaces/order.interface';
import { PaginationDto, PaginationResultDto } from '../../common/queries/dto';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly orderService: OrderService) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new order',
    description: 'Creates a new order for the authenticated user with product details',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Order created successfully',
    type: Order,
  })
  async createOrder(
    @Request() req,
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<Order> {
    return await this.orderService.createOrder(req.user.userId, createOrderDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Find all orders with filtering and pagination',
    description: 'Retrieves all orders with optional filters and pagination',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Orders retrieved successfully',
  })
  async findAllOrders(
    @Query() query: FindAllOrdersDto & PaginationDto,
  ): Promise<PaginationResultDto<Order>> {
    return await this.orderService.findAllOrders(query);
  }

  @Get('my-business-orders')
  @ApiOperation({
    summary: "Get orders for authenticated user's businesses",
    description: 'Retrieves all orders that belong to businesses owned by the authenticated user.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (starts from 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Orders retrieved successfully',
  })
  async findOrdersForMyBusinesses(
    @Request() req,
    @Query() paginationDto: PaginationDto
  ): Promise<PaginationResultDto<Order>> {
    return await this.orderService.findOrdersByUserId(req.user.userId, paginationDto);
  }

  @Get('user')
  @ApiOperation({
    summary: 'Get orders for authenticated user',
    description: 'Retrieves orders for the authenticated user using JWT token.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (starts from 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Orders retrieved successfully',
  })
  async findOrdersForCurrentUser(
    @Request() req,
    @Query() paginationDto: PaginationDto
  ): Promise<PaginationResultDto<Order>> {
    return await this.orderService.findOrdersByUserId(req.user.userId, paginationDto);
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
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (starts from 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Orders retrieved successfully',
  })
  async findOrdersByUserId(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() paginationDto: PaginationDto
  ): Promise<PaginationResultDto<Order>> {
    return await this.orderService.findOrdersByUserId(userId, paginationDto);
  }

  @Get('business/:businessId')
  @ApiOperation({
    summary: 'Get orders by business ID',
    description: 'Retrieves orders for a specific business.',
  })
  @ApiParam({
    name: 'businessId',
    required: true,
    description: 'Business ID to get orders for.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (starts from 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Orders retrieved successfully',
  })
  async findOrdersByBusinessId(
    @Param('businessId', ParseIntPipe) businessId: number,
    @Query() paginationDto: PaginationDto
  ): Promise<PaginationResultDto<Order>> {
    return await this.orderService.findOrdersByBusinessId(businessId, paginationDto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get order by ID',
    description: 'Retrieves a specific order by ID',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Order ID to retrieve',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Order retrieved successfully',
    type: Order,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Order not found',
  })
  async findOrderById(@Param('id', ParseIntPipe) id: number): Promise<Order> {
    return await this.orderService.findOrderById(id);
  }

  @Post('payment/initialize')
  @ApiOperation({
    summary: 'Initialize payment for order',
    description: 'Initializes payment with Monnify and returns checkout URL',
  })
  @ApiBody({ type: InitiatePaymentDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment initialized successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Order not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Payment already processed',
  })
  async initializePayment(@Body() initiatePaymentDto: InitiatePaymentDto) {
    return await this.orderService.initializePayment(initiatePaymentDto);
  }

  @Post('payment/verify')
  @ApiOperation({
    summary: 'Verify payment status',
    description: 'Verifies payment status with Monnify',
  })
  @ApiBody({ type: VerifyPaymentDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment verified successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Order not found',
  })
  async verifyPayment(@Body() verifyPaymentDto: VerifyPaymentDto) {
    return await this.orderService.verifyPayment(verifyPaymentDto);
  }

  @Post('payment/process')
  @ApiOperation({
    summary: 'Process payment for order',
    description: 'Manually processes payment for an order',
  })
  @ApiBody({ type: ProcessPaymentDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment processed successfully',
    type: Order,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Order not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid payment data',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Payment already processed',
  })
  async processPayment(@Body() processPaymentDto: ProcessPaymentDto): Promise<Order> {
    return await this.orderService.processPayment(processPaymentDto);
  }

  @Post('payment/callback')
  @ApiOperation({
    summary: 'Payment callback endpoint',
    description: 'Webhook for Monnify payment callbacks',
  })
  @ApiBody({ type: PaymentCallbackDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment callback processed successfully',
  })
  async handlePaymentCallback(@Body() paymentCallbackDto: PaymentCallbackDto): Promise<Order> {
    return await this.orderService.handlePaymentCallback(paymentCallbackDto);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update order status',
    description: 'Updates the status of an order',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Order ID',
  })
  @ApiBody({ type: UpdateOrderStatusDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Order status updated successfully',
    type: Order,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Order not found',
  })
  async updateOrderStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateOrderStatusDto
  ): Promise<Order> {
    return await this.orderService.updateOrderStatus(id, updateStatusDto);
  }

  @Patch(':orderId/items/:itemId/status')
  @ApiOperation({
    summary: 'Update order item status',
    description: 'Updates the status of a specific item in an order',
  })
  @ApiParam({
    name: 'orderId',
    required: true,
    description: 'Order ID',
  })
  @ApiParam({
    name: 'itemId',
    required: true,
    description: 'Order Item ID',
  })
  @ApiBody({ type: UpdateOrderItemStatusDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Order item status updated successfully',
    type: OrderItem,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Order or order item not found',
  })
  async updateOrderItemStatus(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() updateStatusDto: UpdateOrderItemStatusDto
  ): Promise<OrderItem> {
    return await this.orderService.updateOrderItemStatus(orderId, itemId, updateStatusDto);
  }

  @Get(':id/invoice')
  @ApiOperation({
    summary: 'Generate invoice for order',
    description: 'Generates a PDF invoice for the order',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Order ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invoice generated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Order not found',
  })
  async generateInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response
  ) {
    const pdfBuffer = await this.orderService.generateInvoice(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=invoice-${id}.pdf`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete order',
    description: 'Soft deletes an order by ID',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Order ID',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Order deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Order not found',
  })
  async deleteOrder(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return await this.orderService.deleteOrder(id);
  }
}