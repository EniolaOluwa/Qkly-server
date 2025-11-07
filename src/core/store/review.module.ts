import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewService } from './review.service';
import { Product } from '../product/entity/product.entity';
import { Review } from './entity/review.entity';
import { Business } from '../businesses/business.entity';
import { User } from '../users/user.entity';
import { ReviewController } from './review.controller';
import { OrderItem } from '../order/entity/order-items.entity';
import { Order } from '../order/entity/order.entity';


@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      Product,
      Review,
      User,
      Business
    ])
  ],
  controllers: [ReviewController],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewModule { }
