import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Business } from '../businesses/business.entity';
import { User } from '../users/entity/user.entity';
import { Product } from './entity/product.entity';
import { ProductSize } from './entity/productSize.entity';
import { ProductsController } from './product.controller';
import { ProductService } from './product.service';
import { Category } from '../category/entity/category.entity';
import { CategoryService } from '../category/category.service';
import { UserProgressModule } from '../user-progress/user-progress.module';




import { RestockController } from './restock.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductSize, User, Business, Category]), UserProgressModule],
  controllers: [ProductsController, RestockController],
  providers: [ProductService, CategoryService],
  exports: [ProductService],
})

export class ProductModule { }