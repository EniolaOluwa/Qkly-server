import { Module } from '@nestjs/common';
import { OrderModule } from '../order/order.module';
import { WalletsModule } from '../wallets/wallets.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [OrderModule, WalletsModule],
  controllers: [AdminController],
})
export class AdminModule {}
