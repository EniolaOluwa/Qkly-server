import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './entity/category.entity';
import { Product } from '../product/entity/product.entity';
import { ProductModule } from '../product/product.module';

@Module({
  imports: [TypeOrmModule.forFeature([Category, Product])],
  controllers: [CategoryController],
  providers: [CategoryService],
  exports: [CategoryService], // export so other modules can use it
})
export class CategoryModule { }