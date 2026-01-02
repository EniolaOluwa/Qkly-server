import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductImage } from '../product/entity/product-image.entity';
import { ProductVariant } from '../product/entity/product-variant.entity';
import { Product } from '../product/entity/product.entity';
import { CartController } from './cart.controller';
import { CartScheduler } from './cart.scheduler';
import { CartService } from './cart.service';
import { CartAbandonment } from './entities/cart-abandonment.entity';
import { CartItem } from './entities/cart-item.entity';
import { Cart } from './entities/cart.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cart,
      CartItem,
      Product,
      ProductVariant,
      CartAbandonment,
      ProductImage
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [CartController],
  providers: [CartService, CartScheduler],
  exports: [CartService],
})
export class CartModule { }
