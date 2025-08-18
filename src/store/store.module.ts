import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController, ProductsController, StoreController } from './store.controller';
import { StoreService } from './store.service';
import { Order } from './order.entity';
import { Product } from './product.entity';
import { Review } from './review.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Product, Review])],
  controllers: [OrdersController, ProductsController, StoreController],
  providers: [StoreService],
  exports: [StoreService],
})
export class StoreModule {}
