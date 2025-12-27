import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartModule } from '../cart/cart.module';
import { CategoryModule } from '../category/category.module';
import { PaymentModule } from '../payment/payment.module';
import { ProductVariant } from '../product/entity/product-variant.entity';
import { SharedRepositoryModule } from '../shared/shared-repository.module';
import { WalletsModule } from '../wallets/wallets.module';
import { OrderMetricsService } from './order-metric.service';
import { OrderMetricsController } from './order-metrics.controller';
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
    CartModule,
    TypeOrmModule.forFeature([ProductVariant]),
  ],
  controllers: [OrdersController, OrderMetricsController],
  providers: [OrderService, RefundService, OrderMetricsService],
  exports: [OrderService, OrderMetricsService],
})
export class OrderModule { }