import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Business } from '../businesses/business.entity';
import { OrderItem } from '../order/entity/order-items.entity';
import { Order } from '../order/entity/order.entity';
import { Product } from '../product/entity/product.entity';
import { Transaction } from '../transaction/entity/transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Business, Transaction, Order, OrderItem, Product]),
  ],
  exports: [TypeOrmModule],
})
export class SharedRepositoryModule { }
