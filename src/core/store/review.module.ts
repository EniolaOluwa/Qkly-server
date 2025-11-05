import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewService } from './review.service';
import { Order } from '../order/entity/order.entity';
import { Product } from '../product/entity/product.entity';
import { Review } from './entity/review.entity';
import { Business } from '../businesses/business.entity';
import { User } from '../users/user.entity';
import { ReviewController } from './review.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Product, Review, User, Business])],
  controllers: [ReviewController],
  providers: [ReviewService],
  exports: [ReviewService],
})

export class ReviewModule {}