import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { PaymentModule } from '../payment/payment.module';
import { SharedRepositoryModule } from '../shared/shared-repository.module';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';


@Module({
  imports: [
    HttpModule,
    SharedRepositoryModule,
    PaymentModule,
  ],
  providers: [WalletsService],
  controllers: [WalletsController],
  exports: [WalletsService],
})
export class WalletsModule { }