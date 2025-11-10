import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Business } from '../businesses/business.entity';
import { CategoryModule } from '../category/category.module';
import { Product } from '../product/entity/product.entity';
import { User } from '../users/user.entity';
import { OrderItem } from './entity/order-items.entity';
import { Order } from './entity/order.entity';
// import { OrdersController } from './order.controller';
import { OrderService } from './order.service';
import { OrdersController } from './order.controller';
import { WalletsModule } from '../wallets/wallets.module';



@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Product, User, Business]),
    HttpModule.register({
      timeout: 15000,
      maxRedirects: 5,
    }),
    ConfigModule,
    CategoryModule,
    WalletsModule
  ],
  controllers: [OrdersController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule { }