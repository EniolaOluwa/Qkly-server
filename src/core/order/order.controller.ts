import { Body, Controller, Delete, Get, Headers, HttpCode, HttpStatus, Logger, Param, ParseIntPipe, Patch, Post, Query, Req, Request, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger';
import { Response } from 'express';
import { PaginationDto, PaginationResultDto } from '../../common/queries/dto';
import { ApiAuth, ApiFindOneDecorator, ApiPaginatedResponse } from '../../common/swagger/api-decorators';
import { verifyMonnifySignature } from '../../common/utils/webhook.utils';
import { CreateOrderDto } from './dto/create-order.dto';
import { FindAllOrdersDto, UpdateOrderItemStatusDto, UpdateOrderStatusDto } from './dto/filter-order.dot';
import { InitiatePaymentDto, ProcessPaymentDto, VerifyPaymentDto } from './dto/payment.dto';
import { OrderItem } from './entity/order-items.entity';
import { Order } from './entity/order.entity';
import { OrderService } from './order.service';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../users';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(private readonly orderService: OrderService,
    private readonly configService: ConfigService,
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
  async createOrder(
    @Request() req,
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<Order> {
    return await this.orderService.createOrder(req.user.userId, createOrderDto);
  }

  @Get()
  @ApiAuth()
  @ApiPaginatedResponse(
    Order,
    'Find all orders with filtering and pagination',
    'Retrieves all orders with optional filters and pagination'
  )
  async findAllOrders(
    @Query() query: FindAllOrdersDto & PaginationDto,
  ): Promise<PaginationResultDto<Order>> {
    return await this.orderService.findAllOrders(query);
  }

  @Get('my-business-orders')
  @ApiPaginatedResponse(
    Order,
    "Get orders for authenticated user's businesses",
    'Retrieves all orders that belong to businesses owned by the authenticated user.'
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
    @Request() req,
    @Query() paginationDto: PaginationDto
  ): Promise<PaginationResultDto<Order>> {
    return await this.orderService.findOrdersByUserId(req.user.userId, paginationDto);
  }

  @Get('user')
  @ApiAuth()
  @ApiPaginatedResponse(
    Order,
    'Get orders for authenticated user',
    'Retrieves orders for the authenticated user using JWT token.'
  )
  async findOrdersForCurrentUser(
    @Request() req,
    @Query() paginationDto: PaginationDto
  ): Promise<PaginationResultDto<Order>> {
    return await this.orderService.findOrdersByUserId(req.user.userId, paginationDto);
  }

  @Get('user/:userId')
  @ApiAuth()
  @ApiFindOneDecorator(Order, 'userId', 'Retrieves orders for a specific user. Returns paginated list.')
  async findOrdersByUserId(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() paginationDto: PaginationDto
  ): Promise<PaginationResultDto<Order>> {
    return await this.orderService.findOrdersByUserId(userId, paginationDto);
  }

  @Get('business/:businessId')
  @ApiFindOneDecorator(Order, 'businessId', 'Retrieves orders for a specific business. Returns paginated list.')
  async findOrdersByBusinessId(
    @Param('businessId', ParseIntPipe) businessId: number,
    @Query() paginationDto: PaginationDto
  ): Promise<PaginationResultDto<Order>> {
    return await this.orderService.findOrdersByBusinessId(businessId, paginationDto);
  }

  @Get(':id')
  @ApiAuth()
  @ApiFindOneDecorator(Order)
  async findOrderById(@Param('id', ParseIntPipe) id: number): Promise<Order> {
    return await this.orderService.findOrderById(id);
  }

  @Post('payment/initialize')
  @ApiAuth()
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
  @ApiAuth()
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
    @Body() updateStatusDto: UpdateOrderStatusDto
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
    @Body() updateStatusDto: UpdateOrderItemStatusDto
  ): Promise<OrderItem> {
    return await this.orderService.updateOrderItemStatus(orderId, itemId, updateStatusDto);
  }

  @Get(':id/invoice')
  @ApiAuth()
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
  async handleMonnifyWebhook(
    @Headers('monnify-signature') signature: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response, // Add passthrough: true
  ) {
    try {
      this.logger.log('Received Monnify webhook');

      const rawBody = (request as any).rawBody;
      const webhookData = request.body as any;

      this.logger.log(`Raw body: ${rawBody}`);
      this.logger.log(`Webhook data: ${JSON.stringify(webhookData)}`);

      if (!webhookData) {
        this.logger.error('Webhook data is missing from request body');
        return {
          success: false,
          message: 'Invalid webhook data'
        };
      }

      this.logger.log(`Webhook event type: ${webhookData.eventType}`);

      const clientSecret = this.configService.get<string>('MONNIFY_SECRET_KEY');
      if (signature && clientSecret && rawBody) {
        const isValid = verifyMonnifySignature(signature, rawBody, clientSecret);
        if (!isValid) {
          this.logger.error('Invalid Monnify signature');
          return {
            success: false,
            message: 'Invalid signature'
          };
        }
      } else {
        this.logger.warn('Monnify signature verification skipped');
      }

      this.orderService.processPaymentWebhook(webhookData)
        .then(result => {
          this.logger.log(`Webhook processed successfully`);
        })
        .catch(error => {
          this.logger.error(`Error processing webhook: ${error.message}`, error.stack);
        });

      return {
        success: true,
        message: 'Webhook received'
      };
    } catch (error) {
      this.logger.error(`Error handling webhook: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Error processing webhook'
      };
    }
  }
}