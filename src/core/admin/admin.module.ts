import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Business } from '../businesses/business.entity';
import { Category } from '../category/entity/category.entity';
import { Order } from '../order/entity/order.entity';
import { OrderModule } from '../order/order.module';
import { Product } from '../product/entity/product.entity';
import { User } from '../users';
import { WalletsModule } from '../wallets/wallets.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PaymentModule } from '../payment/payment.module';
import { UsersModule } from '../users/users.module';
import { UserProgressModule } from '../user-progress/user-progress.module';
import { TrafficModule } from '../traffic-events/traffic.module';
import { Transaction } from '../transaction/entity/transaction.entity';
import { CategoryModule } from '../category/category.module';
import { BusinessesModule } from '../businesses/businesses.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Business, Product, Category, User, Transaction]),
    OrderModule,
    WalletsModule,
    PaymentModule,
    UsersModule,
    UserProgressModule,
    TrafficModule,
    CategoryModule,
    BusinessesModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule { }
