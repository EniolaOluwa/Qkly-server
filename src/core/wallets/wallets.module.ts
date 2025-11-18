import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';
import { User } from '../users/entity/user.entity';
import { WalletProvisioningUtil } from '../../common/utils/wallet-provisioning.util';

@Module({
  imports: [TypeOrmModule.forFeature([User]), HttpModule],
  controllers: [WalletsController],
  providers: [WalletsService, WalletProvisioningUtil],
  exports: [WalletsService, WalletProvisioningUtil],
})
export class WalletsModule {}