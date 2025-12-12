import { Body, Controller, Get, Logger, Post, Query, Param, Patch, Delete } from '@nestjs/common';
import { ApiBadRequestResponse, ApiConflictResponse, ApiNotFoundResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Admin } from '../../common/decorators/admin.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@app/common/auth/user-role.enum';
import { CreateAdminDto, UpdateAdminRoleDto, UpdateAdminStatusDto, AdminUserResponseDto } from '../users/dto/admin-management.dto';
import { UsersService, MerchantMetricsResponse } from '../users/users.service';
import { User } from '../users/entity/user.entity';
import { PaymentStatus } from '../order/interfaces/order.interface';
import { OrderService } from '../order/order.service';
import { PaymentService } from '../payment/payment.service';
import { ProgressBackfillService } from '../user-progress/progress-backfill.script';
import { TrafficEventService } from '../device/traffic.service';
import { AdminTrafficFilterDto } from '../device/dto/device.dto';

@ApiTags('Admin')
@Admin()
@Controller('admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly backfill: ProgressBackfillService,
    private readonly orderService: OrderService,
    private readonly paymentService: PaymentService,
    private readonly trafficService: TrafficEventService
  ) { }

  // Admin Metrics Endpoint
  @Get('/merchant-metrics')
  @ApiOperation({
    summary: 'Admin: Get merchant metrics',
    description: 'Returns total, active, inactive, and recent active merchants with sales data.',
  })
  @ApiResponse({
    status: 200,
    description: 'Merchant metrics retrieved successfully',
    type: MerchantMetricsResponse,
  })
  async getMerchantMetrics(): Promise<MerchantMetricsResponse> {
    return this.usersService.merchantMetrics();
  }

  // Admin User Management Endpoints
  @Get('admins')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all admin users' })
  @ApiResponse({ status: 200, description: 'List of admin users', type: [AdminUserResponseDto] })
  async getAdmins(): Promise<AdminUserResponseDto[]> {
    return this.usersService.getAdmins();
  }

  @Get('admins/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get a single admin user by ID' })
  @ApiResponse({ status: 200, description: 'Admin user details', type: AdminUserResponseDto })
  @ApiNotFoundResponse({ description: 'Admin user not found' })
  async getAdminById(@Param('id') id: number): Promise<AdminUserResponseDto> {
    return this.usersService.getAdminById(id);
  }

  @Post('admins')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Create a new admin user',
  })
  @ApiResponse({
    status: 201,
    description: 'Admin user created successfully',
    type: AdminUserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid admin data',
  })
  @ApiConflictResponse({
    description: 'User with this email already exists',
  })
  async createAdmin(
    @Body() createAdminDto: CreateAdminDto,
  ): Promise<AdminUserResponseDto> {
    return this.usersService.createAdmin(createAdminDto);
  }

  @Patch('admins/:id/role')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: "Update an admin user's role",
  })
  @ApiResponse({
    status: 200,
    description: 'Admin user role updated successfully',
    type: AdminUserResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Admin user not found',
  })
  async updateAdminRole(
    @Param('id') id: number,
    @Body() updateAdminRoleDto: UpdateAdminRoleDto,
  ): Promise<AdminUserResponseDto> {
    return this.usersService.updateAdminRole(id, updateAdminRoleDto.newRole);
  }

  @Patch('admins/:id/status')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: "Update an admin user's active status (suspend/activate)",
  })
  @ApiResponse({
    status: 200,
    description: 'Admin user status updated successfully',
    type: AdminUserResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Admin user not found',
  })
  async updateAdminStatus(
    @Param('id') id: number,
    @Body() updateAdminStatusDto: UpdateAdminStatusDto,
  ): Promise<AdminUserResponseDto> {
    return this.usersService.updateAdminStatus(id, updateAdminStatusDto.isActive);
  }

  @Delete('admins/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Delete an admin user',
  })
  @ApiResponse({
    status: 204,
    description: 'Admin user deleted successfully',
  })
  @ApiNotFoundResponse({
    description: 'Admin user not found',
  })
  async deleteAdmin(@Param('id') id: number): Promise<void> {
    await this.usersService.deleteAdmin(id);
  }

  // Existing Payment/Traffic Endpoints
  @Post('payment/verify-and-update')
  @ApiOperation({
    summary: 'Verify payment status with gateway and update if needed',
    description: 'Checks payment status with gateway and updates the order if payment was successful',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment verification completed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Payment verified and updated successfully' },
        data: {
          type: 'object',
          properties: {
            orderId: { type: 'number', example: 1 },
            orderReference: { type: 'string', example: 'ORD-12345678' },
            previousStatus: { type: 'string', example: 'PENDING' },
            currentStatus: { type: 'string', example: 'PAID' },
            provider: { type: 'string', example: 'PAYSTACK' },
            verificationResult: { type: 'object' },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid request data',
  })
  @ApiNotFoundResponse({
    description: 'Order not found',
  })
  async verifyAndUpdatePayment(
    @Body()
    verifyDto: {
      orderId: number;
      transactionReference?: string;
    },
  ): Promise<any> {
    try {
      const { orderId, transactionReference } = verifyDto;

      // Get the order
      const order = await this.orderService.findOrderById(orderId);

      // Use transaction reference from DTO or order
      const txnRef = transactionReference || order.transactionReference;

      this.logger.log(`Verifying payment for order ${order.id}, reference: ${txnRef}`);

      // Verify payment using PaymentService (provider-agnostic)
      const verificationResult = await this.paymentService.verifyPayment(txnRef);

      this.logger.log(
        `Verification result: ${verificationResult.paymentStatus} for order ${order.id}`,
      );

      // Check if payment is successful and order hasn't been marked as paid
      if (
        verificationResult.paymentStatus === 'SUCCESS' &&
        order.paymentStatus !== PaymentStatus.PAID
      ) {
        this.logger.log(`Updating order ${order.id} to PAID status`);

        // Create standardized webhook payload
        const webhookPayload = {
          eventType: 'MANUAL_VERIFICATION',
          eventData: {
            transactionReference: verificationResult.transactionReference,
            paymentReference: verificationResult.paymentReference,
            amount: verificationResult.amount,
            amountPaid: verificationResult.amountPaid,
            customerName: verificationResult.customerName,
            customerEmail: verificationResult.customerEmail,
            paymentStatus: verificationResult.paymentStatus,
            paymentMethod: verificationResult.paymentMethod,
            paidOn: verificationResult.paidOn,
            currency: verificationResult.currency,
            metadata: {
              ...verificationResult.metadata,
              manualVerification: true,
              verifiedAt: new Date().toISOString(),
            },
          },
          provider: verificationResult.provider,
        };

        // Process the webhook to update order
        await this.orderService.processPaymentWebhook(webhookPayload);

        return {
          success: true,
          message: 'Payment verified and updated successfully',
          data: {
            orderId: order.id,
            orderReference: order.orderReference,
            previousStatus: order.paymentStatus,
            currentStatus: PaymentStatus.PAID,
            provider: verificationResult.provider,
            verificationResult: {
              paymentReference: verificationResult.paymentReference,
              transactionReference: verificationResult.transactionReference,
              amount: verificationResult.amountPaid,
              paymentStatus: verificationResult.paymentStatus,
              paymentMethod: verificationResult.paymentMethod,
              paidOn: verificationResult.paidOn,
            },
          },
        };
      }

      // Payment already processed or not successful
      return {
        success: true,
        message:
          order.paymentStatus === PaymentStatus.PAID
            ? 'Order already marked as paid'
            : 'Payment verification completed, no update needed',
        data: {
          orderId: order.id,
          orderReference: order.orderReference,
          paymentStatus: order.paymentStatus,
          provider: verificationResult.provider,
          verificationResult: {
            paymentReference: verificationResult.paymentReference,
            transactionReference: verificationResult.transactionReference,
            amount: verificationResult.amountPaid,
            paymentStatus: verificationResult.paymentStatus,
            paymentMethod: verificationResult.paymentMethod,
            paidOn: verificationResult.paidOn,
          },
        },
      };
    } catch (error) {
      this.logger.error(`Payment verification failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Manually trigger payment webhook processing
   */
  @Post('payment/retry-webhook')
  @ApiOperation({
    summary: 'Retry webhook processing for a payment',
    description: 'Manually trigger webhook processing for failed/missed payment notifications',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processing completed',
  })
  async retryWebhook(
    @Body()
    retryDto: {
      orderId: number;
      webhookPayload: any;
    },
  ): Promise<any> {
    try {
      const { orderId, webhookPayload } = retryDto;

      this.logger.log(`Manually processing webhook for order ${orderId}`);

      const result = await this.orderService.processPaymentWebhook(webhookPayload);

      return {
        success: true,
        message: 'Webhook processed successfully',
        data: result,
      };
    } catch (error) {
      this.logger.error(`Webhook retry failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get order payment status
   */
  @Post('payment/status')
  @ApiOperation({
    summary: 'Get payment status for an order',
    description: 'Retrieve current payment status from both database and payment gateway',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment status retrieved',
  })
  async getPaymentStatus(
    @Body()
    statusDto: {
      orderId: number;
    },
  ): Promise<any> {
    try {
      const { orderId } = statusDto;

      const order = await this.orderService.findOrderById(orderId);

      // Verify with gateway
      const gatewayStatus = await this.paymentService.verifyPayment(
        order.transactionReference,
      );

      return {
        success: true,
        data: {
          orderId: order.id,
          orderReference: order.orderReference,
          databaseStatus: {
            paymentStatus: order.paymentStatus,
            orderStatus: order.status,
            paymentDate: order.paymentDate,
            total: order.total,
          },
          gatewayStatus: {
            provider: gatewayStatus.provider,
            paymentStatus: gatewayStatus.paymentStatus,
            paymentReference: gatewayStatus.paymentReference,
            transactionReference: gatewayStatus.transactionReference,
            amountPaid: gatewayStatus.amountPaid,
            paymentMethod: gatewayStatus.paymentMethod,
            paidOn: gatewayStatus.paidOn,
          },
          statusMatch:
            order.paymentStatus === PaymentStatus.PAID &&
            gatewayStatus.paymentStatus === 'SUCCESS',
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get payment status: ${error.message}`, error.stack);
      throw error;
    }
  }


  @Post('backfill-progress')
  async backfillProgress() {
    return this.backfill.runBackfill();
  }



  @Get('/business-traffic')
  @ApiOperation({
    summary: 'Admin: Query all traffic events',
    description:
      'Full filtering: source, businessId, date ranges, pagination.',
  })
  async getAll(@Query() filters: AdminTrafficFilterDto) {
    return this.trafficService.adminQuery(filters);
  }
}
