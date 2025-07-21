import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController, ProductsController } from './store.controller';
import { StoreService } from './store.service';
import { Order } from './order.entity';
import { Product } from './product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Product])],
  controllers: [OrdersController, ProductsController],
  providers: [StoreService],
  exports: [StoreService],
})
export class StoreModule {}
