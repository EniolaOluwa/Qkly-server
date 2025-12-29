import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransferController } from './transfer.controller';
import { TransferService } from './transfer.service';
import { Transfer } from './entity/transfer.entity';
import { PaymentModule } from '../payment/payment.module'; // Import PaymentModule for PaystackService

@Module({
  imports: [
    TypeOrmModule.forFeature([Transfer]),
    PaymentModule,
  ],
  controllers: [TransferController],
  providers: [TransferService],
  exports: [TransferService],
})
export class TransferModule { }
