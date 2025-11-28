import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { PaginationDto, PaginationResultDto } from '../../common/queries/dto';
import {
  ApiAuth,
  ApiFindOneDecorator,
  ApiPaginatedResponse,
} from '../../common/swagger/api-decorators';
import { PaymentService } from '../payment/payment.service';
import { JwtAuthGuard } from '../users';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  FindAllOrdersDto,
  UpdateOrderItemStatusDto,
  UpdateOrderStatusDto,
} from './dto/filter-order.dot';
import { InitiatePaymentDto, ProcessPaymentDto, VerifyPaymentDto } from './dto/payment.dto';
import { CreateRefundDto } from './dto/refund.dto';
import { OrderItem } from './entity/order-items.entity';
import { Order } from './entity/order.entity';
import { OrderService } from './order.service';
import { RefundService } from './refund.service';
import { RequestWithUser } from '../../common/interfaces';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(
    private readonly orderService: OrderService,
    private readonly paymentService: PaymentService,
    private readonly refundService: RefundService,
  ) { }

  @Post()
  @ApiAuth()
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
  async createOrder(@Request() req: RequestWithUser,
  , @Body() createOrderDto: CreateOrderDto): Promise<Order> {
    return await this.orderService.createOrder(req.user.userId, createOrderDto);
  }

  @Get()
  @ApiAuth()
  @ApiPaginatedResponse(
    Order,
    'Find all orders with filtering and pagination',
    'Retrieves all orders with optional filters and pagination',
  )
  async findAllOrders(@Query() query: FindAllOrdersDto): Promise<PaginationResultDto<Order>> {
    return await this.orderService.findAllOrders(query);
  }

  @Get('my-business-orders')
  @ApiPaginatedResponse(
    Order,
    "Get orders for authenticated user's businesses",
    'Retrieves all orders that belong to businesses owned by the authenticated user.',
  )
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
    @Request() req: RequestWithUser,
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginationResultDto<Order>> {
    return await this.orderService.findOrdersByUserId(req.user.userId, paginationDto);
  }

  @Get('user')
  @ApiAuth()
  @ApiPaginatedResponse(
    Order,
    'Get orders for authenticated user',
    'Retrieves orders for the authenticated user using JWT token.',
  )
  async findOrdersForCurrentUser(
    @Request() req: RequestWithUser,
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginationResultDto<Order>> {
    return await this.orderService.findOrdersByUserId(req.user.userId, paginationDto);
  }

  @Get('user/:userId')
  @ApiAuth()
  @ApiFindOneDecorator(
    Order,
    'userId',
    'Retrieves orders for a specific user. Returns paginated list.',
  )
  async findOrdersByUserId(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginationResultDto<Order>> {
    return await this.orderService.findOrdersByUserId(userId, paginationDto);
  }

  @Get('business/:businessId')
  @ApiFindOneDecorator(
    Order,
    'businessId',
    'Retrieves orders for a specific business. Returns paginated list.',
  )
  async findOrdersByBusinessId(
    @Param('businessId', ParseIntPipe) businessId: number,
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginationResultDto<Order>> {
    return await this.orderService.findOrdersByBusinessId(businessId, paginationDto);
  }

  @Get(':id')
  @ApiAuth()
  @ApiFindOneDecorator(Order)
  async findOrderById(@Param('id', ParseIntPipe) id: number): Promise<Order> {
    return await this.orderService.findOrderById(id);
  }

  // ============================================================
  // PAYMENT ENDPOINTS (Updated API Documentation)
  // ============================================================

  @Post('payment/initialize')
  @ApiAuth()
  @ApiOperation({
    summary: 'Initialize payment for order',
    description:
      'Initializes payment with configured payment provider (Monnify/Paystack) and returns checkout URL',
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
  @ApiAuth()
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
  async processPayment(@Body() processPaymentDto: ProcessPaymentDto): Promise<Order> {
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
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ): Promise<Order> {
    return await this.orderService.updateOrderStatus(id, updateStatusDto);
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
    return await this.orderService.updateOrderItemStatus(orderId, itemId, updateStatusDto);
  }

  @Delete(':id')
  @ApiAuth()
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

  @Public()
  @Post('webhook/monnify')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Monnify webhook handler',
    description: 'Receives and processes payment webhooks from Monnify',
  })
  async handleMonnifyWebhook(
    @Headers('monnify-signature') signature: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      this.logger.log('Received Monnify webhook');

      const webhookData = request.body as any;
      const rawBody = (request as any).rawBody;

      if (!webhookData) {
        this.logger.error('Webhook data is missing from request body');
        return {
          success: false,
          message: 'Invalid webhook data',
        };
      }

      this.logger.log(`Webhook event type: ${webhookData.eventType}`);

      // Validate webhook signature using PaymentService
      if (signature && rawBody) {
        const isValid = this.paymentService.validateWebhookSignature(webhookData, signature);

        if (!isValid) {
          this.logger.error('Invalid Monnify webhook signature');
          return {
            success: false,
            message: 'Invalid signature',
          };
        }
        this.logger.log('Monnify webhook signature validated successfully');
      } else {
        this.logger.warn('Monnify signature verification skipped - missing signature or body');
      }

      // Process webhook asynchronously
      this.orderService
        .processPaymentWebhook(webhookData)
        .then((result) => {
          this.logger.log(`Monnify webhook processed successfully: ${JSON.stringify(result)}`);
        })
        .catch((error) => {
          this.logger.error(`Error processing Monnify webhook: ${error.message}`, error.stack);
        });

      return {
        success: true,
        message: 'Webhook received',
      };
    } catch (error) {
      this.logger.error(`Error handling Monnify webhook: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Error processing webhook',
      };
    }
  }

  @Public()
  @Post('webhook/paystack')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Paystack webhook handler',
    description: 'Receives and processes payment webhooks from Paystack',
  })
  async handlePaystackWebhook(
    @Headers('x-paystack-signature') signature: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      this.logger.log('Received Paystack webhook');

      const webhookData = request.body as any;

      if (!webhookData) {
        this.logger.error('Webhook data is missing from request body');
        return {
          success: false,
          message: 'Invalid webhook data',
        };
      }

      this.logger.log(`Webhook event type: ${webhookData.event}`);

      // Validate webhook signature using PaymentService
      if (signature) {
        const isValid = this.paymentService.validateWebhookSignature(webhookData, signature);

        if (!isValid) {
          this.logger.error('Invalid Paystack webhook signature');
          return {
            success: false,
            message: 'Invalid signature',
          };
        }
        this.logger.log('Paystack webhook signature validated successfully');
      } else {
        this.logger.warn('Paystack signature verification skipped - missing signature');
      }

      // Process webhook asynchronously
      this.orderService
        .processPaymentWebhook(webhookData)
        .then((result) => {
          this.logger.log(`Paystack webhook processed successfully: ${JSON.stringify(result)}`);
        })
        .catch((error) => {
          this.logger.error(`Error processing Paystack webhook: ${error.message}`, error.stack);
        });

      return {
        success: true,
        message: 'Webhook received',
      };
    } catch (error) {
      this.logger.error(`Error handling Paystack webhook: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Error processing webhook',
      };
    }
  }

  @Get('payment/provider')
  @ApiAuth()
  @ApiOperation({
    summary: 'Get active payment provider',
    description: 'Returns the currently configured payment provider (MONNIFY or PAYSTACK)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment provider retrieved successfully',
    schema: {
      example: {
        provider: 'PAYSTACK',
        status: 'active',
      },
    },
  })
  async getPaymentProvider() {
    return {
      provider: this.paymentService.getActiveProvider(),
      status: 'active',
    };
  }

  @Get('payment/health')
  @Public()
  @ApiOperation({
    summary: 'Check payment system health',
    description: 'Verifies connectivity with the configured payment provider',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment system is healthy',
  })
  async checkPaymentHealth() {
    return await this.paymentService.healthCheck();
  }

  @Post('refund')
  @ApiOperation({ summary: 'Process a refund for an order' })
  @ApiResponse({ status: 200, description: 'Refund processed successfully' })
  async processRefund(@Body() createRefundDto: CreateRefundDto, @Request() req): Promise<any> {
    const userId = req.user.id;
    return await this.refundService.processRefund(createRefundDto, userId);
  }

  /**
   * Get refund history for an order
   */
  @Get(':orderId/refunds')
  @ApiOperation({ summary: 'Get refund history for an order' })
  @ApiResponse({ status: 200, description: 'Refund history retrieved' })
  async getOrderRefunds(@Param('orderId') orderId: number): Promise<any> {
    return await this.refundService.getOrderRefunds(orderId);
  }
}
