import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettlementsService } from './settlements.service';
import { SettlementsController } from './settlements.controller';
import { Settlement } from './entities/settlement.entity';
import { PaymentModule } from '../payment/payment.module';
import { BankAccountsModule } from '../bank-accounts/bank-accounts.module';
import { WalletsModule } from '../wallets/wallets.module';
import { Wallet } from '../wallets/entities/wallet.entity';
import { Transaction } from '../transaction/entity/transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Settlement, Transaction, Wallet]),
    forwardRef(() => PaymentModule),
    BankAccountsModule,
    WalletsModule,
  ],
  controllers: [SettlementsController],
  providers: [SettlementsService],
  exports: [SettlementsService],
})
export class SettlementsModule { }
