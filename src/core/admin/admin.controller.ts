import { Body, Controller, Logger, Post } from '@nestjs/common';
import { PaymentStatus } from '../order/interfaces/order.interface';
import { OrderService } from '../order/order.service';
import { WalletsService } from '../wallets/wallets.service';
import { ApiOperation, ApiResponse, ApiBadRequestResponse, ApiNotFoundResponse } from '@nestjs/swagger';

@Controller('admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly orderService: OrderService,
    private readonly walletsService: WalletsService,
  ) { }

  @Post('payment/verify-and-update')
  // @UseGuards(AdminAuthGuard)
  @ApiOperation({
    summary: 'Verify payment status with gateway and update if needed',
    description: 'Checks payment status with gateway and updates the order if payment was successful'
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
            previousStatus: { type: 'string', example: 'PENDING' },
            currentStatus: { type: 'string', example: 'PAID' },
            verificationResult: { type: 'object' }
          }
        }
      }
    }
  })
  @ApiBadRequestResponse({
    description: 'Invalid request data'
  })
  @ApiNotFoundResponse({
    description: 'Order not found'
  })
  async verifyAndUpdatePayment(
    @Body() verifyDto: {
      orderId: number,
      transactionReference?: string
    }
  ): Promise<any> {
    const { orderId, transactionReference } = verifyDto;

    const order = await this.orderService.findOrderById(orderId);

    const txnRef = transactionReference || order.transactionReference;

    const transaction = await this.walletsService.verifyMonnifyPayment(txnRef);

    if (transaction.paymentStatus === 'PAID' && order.paymentStatus !== PaymentStatus.PAID) {
      const paymentCallbackDto = {
        eventType: 'MANUAL_VERIFICATION',
        eventData: {
          productType: 'COLLECTION',
          transactionReference: transaction.transactionReference,
          paymentReference: transaction.paymentReference,
          amountPaid: transaction.amount,
          totalPayment: transaction.amount,
          settlementAmount: transaction.amount * 0.985,
          paymentStatus: transaction.paymentStatus,
          paymentMethod: transaction.paymentMethod,
          paidOn: transaction.createdOn,
          customer: {
            name: transaction.customerName,
            email: transaction.customerEmail,
          },
          metaData: {
            ...transaction.meta,
            manualVerification: true
          },
        },
      };

      await this.orderService.processWebhookEvent(paymentCallbackDto);

      return {
        success: true,
        message: 'Payment verified and updated successfully',
        data: {
          orderId: order.id,
          previousStatus: order.paymentStatus,
          currentStatus: PaymentStatus.PAID,
          verificationResult: transaction
        }
      };
    }

    return {
      success: true,
      message: 'Payment verification completed, no update needed',
      data: {
        orderId: order.id,
        paymentStatus: order.paymentStatus,
        verificationResult: transaction
      }
    };
  }
}
