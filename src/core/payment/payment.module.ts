// src/core/payment/payment.module.ts
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { OrderService } from '../order/order.service';
import { SharedRepositoryModule } from '../shared/shared-repository.module';
import { PaymentService } from './payment.service';
import { PaystackIntegrationService } from './paystack-integration.service';
import { PaystackPollingService } from './paystack-polling.service';
import { MonnifyProvider } from './providers/monnify.provider';
import { PaystackWebhookHandler } from './providers/paystack-webhook.handler';
import { PaystackProvider } from './providers/paystack.provider';
@Module({
  imports: [
    HttpModule,
    ScheduleModule.forRoot(),
    SharedRepositoryModule,
    // Import OrderModule if you need OrderService
  ],
  providers: [
    PaymentService,
    MonnifyProvider,
    PaystackProvider,
    PaystackWebhookHandler,
    PaystackIntegrationService,
    PaystackPollingService,
    // Remove OrderService from here
  ],
  exports: [
    PaymentService,
    PaystackProvider,
    PaystackWebhookHandler,
    PaystackIntegrationService,
    PaystackPollingService
  ],
})
export class PaymentModule { }
