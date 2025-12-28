import { HttpModule } from '@nestjs/axios';
import { Module, forwardRef } from '@nestjs/common';
import { WalletProvisioningUtil } from '../../common/utils/wallet-provisioning.util';
import { PaymentModule } from '../payment/payment.module';
import { BankAccountsModule } from '../bank-accounts/bank-accounts.module';
import { SharedRepositoryModule } from '../shared/shared-repository.module';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';


@Module({
  imports: [
    HttpModule,
    SharedRepositoryModule,
    forwardRef(() => PaymentModule),
    BankAccountsModule,
  ],
  providers: [WalletsService, WalletProvisioningUtil],
  controllers: [WalletsController],
  exports: [WalletsService, WalletProvisioningUtil],
})
export class WalletsModule { }