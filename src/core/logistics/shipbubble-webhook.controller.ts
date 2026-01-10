import { Controller, Post, Body, Headers, BadRequestException, RawBodyRequest, Req, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ShipBubbleService } from './shipbubble.service';

@ApiTags('Logistics')
@Controller('logistics/webhooks')
export class ShipBubbleWebhookController {
  private readonly logger = new Logger(ShipBubbleWebhookController.name);

  constructor(private readonly shipBubbleService: ShipBubbleService) { }

  @Post('shipbubble')
  @ApiOperation({ summary: 'Handle ShipBubble webhook events' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-ship-signature') signature: string,
    @Body() payload: any,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing x-ship-signature header');
    }

    if (!req.rawBody) {
      this.logger.error('Raw body not available for signature verification');
      throw new BadRequestException('Raw body missing');
    }

    // Note: We use the raw body for signature verification to ensure integrity
    const isValid = this.shipBubbleService.validateWebhookSignature(
      req.rawBody.toString(),
      signature,
    );

    if (!isValid) {
      this.logger.error('Invalid ShipBubble webhook signature');
      throw new BadRequestException('Invalid signature');
    }

    this.logger.log(`Received ShipBubble webhook: ${payload.event}`);

    // Process the event asynchronously
    await this.shipBubbleService.processWebhook(payload);

    return { status: 'success' };
  }
}
