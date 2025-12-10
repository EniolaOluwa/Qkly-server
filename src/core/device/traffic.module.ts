import { Module } from '@nestjs/common';
import { TrafficEventService } from './traffic.service';
import { TrafficEventController } from './traffic.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrafficEvent } from './entity/device.entity';
import { Business } from '../businesses/business.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TrafficEvent, Business])],
  controllers: [TrafficEventController],
  providers: [TrafficEventService],
  exports: [TrafficEventService],
})
export class TrafficModule { }

