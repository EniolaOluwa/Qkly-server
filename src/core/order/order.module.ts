import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CategoryModule } from '../category/category.module';
import { PaymentModule } from '../payment/payment.module';
import { SharedRepositoryModule } from '../shared/shared-repository.module';
import { WalletsModule } from '../wallets/wallets.module';
import { PaymentDtoAdapter } from './dto/payment-dto-adapter.service';
import { OrdersController } from './order.controller';
import { OrderService } from './order.service';
import { RefundService } from './refund.service';




@Module({
  imports: [
    SharedRepositoryModule,
    HttpModule.register({ timeout: 15000, maxRedirects: 5 }),
    ConfigModule,
    CategoryModule,
    WalletsModule,
    PaymentModule,
  ],
  controllers: [OrdersController],
  providers: [OrderService, PaymentDtoAdapter, RefundService],
  exports: [OrderService],
})
export class OrderModule { }