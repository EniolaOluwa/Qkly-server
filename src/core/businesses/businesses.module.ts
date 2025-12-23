import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CloudinaryUtil } from '../../common/utils/cloudinary.util';
import { Role } from '../roles/entities/role.entity';
import { UserProgressModule } from '../user-progress/user-progress.module';
import { User } from '../users/entity/user.entity';
import { BusinessType } from './business-type.entity';
import { Business } from './business.entity';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './business-dashboard.service';
import { Order } from '../order/entity/order.entity';
import { Product } from '../product/entity/product.entity';
import { TrafficEvent } from '../traffic-events/entity/traffic-events.entity';
import { Review } from '../review/entity/review.entity';
import { Transaction } from '../transaction/entity/transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Business, BusinessType, User, Role, Order, Product, TrafficEvent, Review, Transaction]),
    ConfigModule,
    UserProgressModule
  ],
  controllers: [BusinessesController, DashboardController],
  providers: [BusinessesService, CloudinaryUtil, DashboardService],
  exports: [BusinessesService, DashboardService],
})
export class BusinessesModule { }
