import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InsightsService } from './insights.service';
import { InsightsController } from './insights.controller';
import { StoreVisit } from './entities/store-visit.entity';
import { Order } from '../order/entity/order.entity';
import { OrderItem } from '../order/entity/order-items.entity';
import { Business } from '../businesses/business.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([StoreVisit, Order, OrderItem, Business]),
  ],
  controllers: [InsightsController],
  providers: [InsightsService],
  exports: [InsightsService],
})
export class InsightsModule {}

