
import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly paymentService: PaymentService) { }

  @Post('webhook')
  @Public() // Webhooks are public endpoints called by Paystack
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Handle payment provider webhooks',
    description: 'Receives and processes webhook events from Paystack (e.g., successful payments, transfers).',
  })
  @ApiHeader({
    name: 'x-paystack-signature',
    description: 'HMAC SHA512 signature of the request body',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-paystack-signature') signature: string,
    @Req() req: any,
  ) {
    this.logger.log(`Received webhook from ${this.paymentService.getActiveProvider()}`);

    // Pass rawBody for signature validation if available (from main.ts middleware)
    // Fallback to stringified body is dangerous but handled by provider if needed
    const rawBody = req.rawBody;

    await this.paymentService.processWebhook(payload, signature, rawBody);

    return { status: 'success' };
  }
}
