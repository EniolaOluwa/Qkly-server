import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShipBubbleService } from './shipbubble.service';
import { OrderShipment } from '../order/entity/order-shipment.entity';
import { OrderModule } from '../order/order.module';
import { LogisticsController } from './logistics.controller';
import { ShipBubbleWebhookController } from './shipbubble-webhook.controller';

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([OrderShipment]), forwardRef(() => OrderModule)],
  controllers: [LogisticsController, ShipBubbleWebhookController],
  providers: [ShipBubbleService],
  exports: [ShipBubbleService],
})
export class LogisticsModule { }
