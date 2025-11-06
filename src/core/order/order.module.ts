import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './order.controller';
import { OrderService } from './order.service';
import { Order } from '../order/entity/order.entity';
import { Business } from '../businesses/business.entity';
import { User } from '../users/user.entity';


@Module({
  imports: [TypeOrmModule.forFeature([Order, User, Business])],
  controllers: [OrdersController],
  providers: [OrderService],
  exports: [OrderService],
})

export class OrderModule {}
