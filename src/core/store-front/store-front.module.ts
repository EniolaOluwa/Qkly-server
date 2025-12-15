import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { StoreFrontService } from './store-front.service';
import { StoreFrontController } from './store-front.controller';
import { Product } from '../product/entity/product.entity';
import { Business } from '../businesses/business.entity';
import { Category } from '../category/entity/category.entity';
import { BusinessType } from '../businesses/business-type.entity';
import { CloudinaryUtil } from '../../common/utils/cloudinary.util';
import { ProductModule } from '../product/product.module';
import { BusinessesModule } from '../businesses/businesses.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Business, Category, BusinessType]),
    ConfigModule,
    ProductModule,
    BusinessesModule
  ],
  controllers: [StoreFrontController],
  providers: [StoreFrontService, CloudinaryUtil],
  exports: [StoreFrontService]
})
export class StoreFrontModule { }