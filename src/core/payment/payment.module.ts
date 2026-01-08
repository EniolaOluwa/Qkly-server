// src/core/payment/payment.module.ts
import { HttpModule } from '@nestjs/axios';
import { Module, forwardRef } from '@nestjs/common';
import { WalletsModule } from '../wallets/wallets.module';

import { OrderModule } from '../order/order.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SharedRepositoryModule } from '../shared/shared-repository.module';
import { PaymentService } from './payment.service';
import { PaystackIntegrationService } from './paystack-integration.service';
import { PaystackWebhookHandler } from './providers/paystack-webhook.handler';
import { PaystackProvider } from './providers/paystack.provider';
import { PaymentController } from './payment.controller';

@Module({
  controllers: [PaymentController],
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    ScheduleModule.forRoot(),
    SharedRepositoryModule,
    forwardRef(() => OrderModule),
    forwardRef(() => WalletsModule),
  ],
  providers: [
    PaymentService,
    PaystackProvider,
    PaystackWebhookHandler,
    PaystackIntegrationService,
  ],
  exports: [
    PaymentService,
    PaystackProvider,
    PaystackWebhookHandler,
    PaystackIntegrationService,
  ],
})
export class PaymentModule { }
