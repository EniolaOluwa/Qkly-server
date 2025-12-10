import { Body, Controller, Logger, Post } from '@nestjs/common';
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Admin } from '../../common/decorators/admin.decorator';
import { PaymentStatus } from '../order/interfaces/order.interface';
import { OrderService } from '../order/order.service';
import { PaymentService } from '../payment/payment.service';
import { ProgressBackfillService } from '../user-progress/progress-backfill.script';


@Admin()
@Controller('admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly backfill: ProgressBackfillService,
    private readonly orderService: OrderService,
    private readonly paymentService: PaymentService,
  ) { }

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
}