import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoreFrontService } from './store-front.service';
import { StoreFrontController } from './store-front.controller';
import { Product } from '../product/entity/product.entity';
import { Business } from '../businesses/business.entity';
import { Category } from '../category/entity/category.entity';
import { BusinessType } from '../businesses/business-type.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Business, Category, BusinessType])
  ],
  controllers: [StoreFrontController],
  providers: [StoreFrontService],
  exports: [StoreFrontService]
})
export class StoreFrontModule { }