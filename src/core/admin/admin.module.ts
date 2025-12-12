import { Module } from '@nestjs/common';
import { OrderModule } from '../order/order.module';
import { WalletsModule } from '../wallets/wallets.module';
import { AdminController } from './admin.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    OrderModule,
    WalletsModule,
    UsersModule
  ],
  controllers: [AdminController],
})
export class AdminModule { }
