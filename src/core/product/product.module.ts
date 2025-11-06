import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsController } from './product.controller';
import { Product } from './entity/product.entity';
import { ProductSize } from './entity/productSize.entity';
import { Business } from '../businesses/business.entity';
import { User } from '../users/user.entity';
import { ProductService } from './product.service';



@Module({
  imports: [TypeOrmModule.forFeature([Product, User, Business, ProductSize])],
  controllers: [ProductsController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
