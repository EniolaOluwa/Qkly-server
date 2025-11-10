import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Business } from '../businesses/business.entity';
import { User } from '../users/user.entity';
import { Product } from './entity/product.entity';
import { ProductSize } from './entity/productSize.entity';
import { ProductsController } from './product.controller';
import { ProductService } from './product.service';
import { CategoryModule } from '../category/category.module';



@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductSize, User, Business]), CategoryModule],
  controllers: [ProductsController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule { }