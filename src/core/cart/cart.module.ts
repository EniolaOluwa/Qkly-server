import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { CartScheduler } from './cart.scheduler';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { Product } from '../product/entity/product.entity';
import { ProductVariant } from '../product/entity/product-variant.entity';
import { CartAbandonment } from './entities/cart-abandonment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cart,
      CartItem,
      Product,
      ProductVariant,
      CartAbandonment
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [CartController],
  providers: [CartService, CartScheduler],
  exports: [CartService],
})
export class CartModule { }
