import { BadRequestException, Body, Controller, Delete, Get, Headers, HttpCode, HttpStatus, Logger, Param, ParseIntPipe, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { BusinessGuard } from '../../common/guards/business.guard';
import { PaginationDto, PaginationResultDto } from '../../common/queries/dto';
import { ApiAuth, ApiFindOneDecorator } from '../../common/swagger/api-decorators';
import { ErrorHelper } from '../../common/utils';
import { PaymentService } from '../payment/payment.service';
import { JwtAuthGuard } from '../users';
import { CreateOrderFromCartDto } from './dto/create-order.dto';
import { AcceptOrderDto, FindBusinessOrdersDto, RejectOrderDto, UpdateOrderItemStatusDto, UpdateOrderStatusDto } from './dto/filter-order.dto';
import { OrderWithPaymentResponseDto } from './dto/order-response.dto';
import { InitiatePaymentDto, ProcessPaymentDto, VerifyPaymentDto } from './dto/payment.dto';
import { InitiateRefundDto } from './dto/refund.dto';
import { OrderItem } from './entity/order-items.entity';
import { Order } from './entity/order.entity';
import { OrderService } from './order.service';
import { RefundService } from './refund.service';


@ApiTags('Orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(
    private readonly orderService: OrderService,
    private readonly paymentService: PaymentService,
    private readonly refundService: RefundService,
  ) {
    this.logger.log('OrdersController Initialized - Refund DTO Update Check');
  }


  @Post('cart')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiHeader({
    name: 'x-session-id',
    description: 'Guest Session ID (UUID)',
    required: true,
  })
  @ApiOperation({ summary: 'Create order from active cart' })
  @ApiResponse({ status: 201, description: 'Order created successfully from cart', type: OrderWithPaymentResponseDto })
  async createOrderFromCart(
    @Request() req,
    @Body() createOrderDto: CreateOrderFromCartDto,
    @Headers() headers,
  ): Promise<any> {
    const sessionId = headers['x-session-id'];
    if (!sessionId) {
      throw new BadRequestException('Session ID is required');
    }
    return await this.orderService.createOrderFromCart(sessionId, createOrderDto);
  }



  @Public()
  @Get('customer/email/:email')
  @ApiOperation({
    summary: 'Get orders by customer email',
    description: 'Retrieves all orders for a given customer email. Useful for order tracking without authentication.',
  })
  @ApiParam({
    name: 'email',
    required: true,
    description: 'Customer email address',
    example: 'customer@example.com',
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
  async findOrdersByCustomerEmail(
    @Param('email') email: string,
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginationResultDto<Order>> {
    return await this.orderService.findOrdersByCustomerEmail(email, paginationDto);
  }


  @Public()
  @Get(':id/status-history')
  @ApiOperation({
    summary: 'Get order status history',
    description: 'Retrieves the complete status history for an order, showing all status changes.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Order ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Status history retrieved successfully',
    schema: {
      example: [
        {
          status: 'PENDING',
          timestamp: '2024-01-15T10:30:00Z',
          updatedBy: 1,
          notes: 'Order created',
        },
        {
          status: 'CONFIRMED',
          timestamp: '2024-01-15T10:35:00Z',
          updatedBy: 1,
          notes: 'Payment received',
        },
        {
          status: 'PROCESSING',
          timestamp: '2024-01-15T11:00:00Z',
          updatedBy: 2,
          notes: 'Order being prepared',
        },
      ],
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Order not found',
  })
  async getOrderStatusHistory(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.orderService.getOrderStatusHistory(id);
  }

  @Get('business/:businessId')
  @UseGuards(JwtAuthGuard, BusinessGuard)
  @ApiAuth()
  @ApiFindOneDecorator(
    Order,
    'businessId',
    'Retrieves orders for a specific business. Returns paginated list.',
  )
  async findOrdersByBusinessId(
    @Param('businessId', ParseIntPipe) businessId: number,
    @Query() query: FindBusinessOrdersDto,): Promise<PaginationResultDto<Order>> {
    return await this.orderService.findOrdersByBusinessId(
      businessId,
      query,
    );
  }


  @Patch(':id/accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Accept an order (Business action)',
    description: 'Business accepts a paid order and moves it to CONFIRMED status',
  })
  @ApiParam({
    name: 'id',
    description: 'Order ID',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Order accepted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Order cannot be accepted (not paid, wrong status, or business mismatch)'
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async acceptOrder(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() acceptOrderDto: AcceptOrderDto,
  ) {
    // Get business ID from user's business
    const user = await this.orderService['userRepository'].findOne({
      where: { id: req.user.userId },
      relations: ['business'],
    });

    if (!user?.businessId) {
      throw new Error('User does not have a business');
    }

    return this.orderService.acceptOrder(id, user.businessId, acceptOrderDto.notes);
  }


  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject an order (Business action)',
    description: 'Business rejects a paid order, initiates refund, and returns inventory',
  })
  @ApiParam({
    name: 'id',
    description: 'Order ID',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Order rejected successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Order cannot be rejected (not paid, wrong status, or business mismatch)'
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async rejectOrder(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() rejectOrderDto: RejectOrderDto,
  ) {
    // Get business ID from user's business
    const user = await this.orderService['userRepository'].findOne({
      where: { id: req.user.userId },
      relations: ['business'],
    });

    if (!user?.businessId) {
      ErrorHelper.NotFoundException('User does not have a business');
    }

    return this.orderService.rejectOrder(id, user.businessId, rejectOrderDto.reason);
  }


  @Public()
  @Get('reference/:reference')
  @ApiOperation({ summary: 'Get order by reference' })
  @ApiParam({
    name: 'reference',
    description: 'Order reference',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Order retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrderByReference(@Param('reference') reference: string) {
    return this.orderService.findOrderByReference(reference);
  }


  @Public()
  @Get(':id')
  @ApiFindOneDecorator(Order)
  async findOrderById(@Param('id', ParseIntPipe) id: number): Promise<Order> {
    return await this.orderService.findOrderById(id);
  }

  // ============================================================
  // PAYMENT ENDPOINTS (Updated API Documentation)
  // ============================================================




  @Post('payment/initialize')
  @Public()
  @ApiOperation({
    summary: 'Initialize payment for order',
    description: 'Initializes payment with Paystack and returns checkout URL',
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
  @Public()
  @ApiOperation({
    summary: 'Verify payment status',
    description: 'Verifies payment status with configured payment provider',
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
  @ApiAuth()
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
  async processPayment(
    @Body() processPaymentDto: ProcessPaymentDto,
  ): Promise<Order> {
    return await this.orderService.processPayment(processPaymentDto);
  }

  @Patch(':id/status')
  @ApiAuth()
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
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ): Promise<Order> {

    const user = await this.orderService['userRepository'].findOne({
      where: { id: req.user.userId },
      relations: ['business'],
    });

    return await this.orderService.updateOrderStatus(id, updateStatusDto, user?.businessId,
    );
  }

  @Patch(':orderId/items/:itemId/status')
  @ApiAuth()
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
    @Body() updateStatusDto: UpdateOrderItemStatusDto,
  ): Promise<OrderItem> {
    return await this.orderService.updateOrderItemStatus(
      orderId,
      itemId,
      updateStatusDto,
    );
  }

  @Delete(':id')
  @ApiAuth()
  @ApiBearerAuth()
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



  @Post('refund')
  @ApiAuth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process a refund for an order' })
  @ApiResponse({ status: 200, description: 'Refund processed successfully' })
  async processRefund(
    @Body() createRefundDto: InitiateRefundDto,
    @Request() req
  ): Promise<any> {

    const userId = req.user.userId
    return await this.refundService.processRefund(createRefundDto, userId);
  }

  @Get(':orderId/refunds')
  @ApiAuth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get refund history for an order' })
  @ApiResponse({ status: 200, description: 'Refund history retrieved' })
  async getOrderRefunds(@Param('orderId') orderId: number): Promise<any> {
    return await this.refundService.getOrderRefunds(orderId);
  }
}
