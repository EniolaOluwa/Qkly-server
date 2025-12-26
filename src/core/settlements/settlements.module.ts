import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettlementsService } from './settlements.service';
import { SettlementsController } from './settlements.controller';
import { Settlement } from './entities/settlement.entity';
import { PaymentModule } from '../payment/payment.module';
import { BankAccountsModule } from '../bank-accounts/bank-accounts.module';
import { Wallet } from '../wallets/entities/wallet.entity';
import { Transaction } from '../transaction/entity/transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Settlement, Transaction, Wallet]),
    PaymentModule,
    BankAccountsModule,
  ],
  controllers: [SettlementsController],
  providers: [SettlementsService],
  exports: [SettlementsService],
})
export class SettlementsModule { }
