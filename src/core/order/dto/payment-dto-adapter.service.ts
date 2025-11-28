import { Injectable } from '@nestjs/common';
import { MonnifyWebhookDto, PaymentCallbackDto } from './payment.dto';

@Injectable()
export class PaymentDtoAdapter {
  toPaymentCallbackDto(webhookDto: MonnifyWebhookDto): PaymentCallbackDto {
    return {
      eventType: webhookDto.eventType,
      eventData: {
        productType: webhookDto.eventData.product?.type || 'COLLECTION',
        transactionReference: webhookDto.eventData.transactionReference,
        paymentReference: webhookDto.eventData.paymentReference,
        amountPaid: webhookDto.eventData.amountPaid,
        totalPayment: webhookDto.eventData.totalPayable,
        settlementAmount:
          typeof webhookDto.eventData.settlementAmount === 'string'
            ? parseFloat(webhookDto.eventData.settlementAmount)
            : webhookDto.eventData.settlementAmount,
        paymentStatus: webhookDto.eventData.paymentStatus,
        paymentMethod: webhookDto.eventData.paymentMethod,
        paidOn: webhookDto.eventData.paidOn,
        customer: webhookDto.eventData.customer,
        metaData: webhookDto.eventData.metaData,
      },
    };
  }

  processWebhookData(webhookData: MonnifyWebhookDto | PaymentCallbackDto): PaymentCallbackDto {
    // Check if it's already a PaymentCallbackDto by checking for productType
    if ('eventData' in webhookData && 'productType' in webhookData.eventData) {
      return webhookData as PaymentCallbackDto;
    }

    // Otherwise, convert from MonnifyWebhookDto
    return this.toPaymentCallbackDto(webhookData as MonnifyWebhookDto);
  }
}
