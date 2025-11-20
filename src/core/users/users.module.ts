import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtStrategy } from '../../common/auth/jwt.strategy';
import { RoleGuard } from '../../common/guards/role.guard';
import { WalletProvisioningUtil } from '../../common/utils/wallet-provisioning.util';
import { WalletsModule } from '../wallets/wallets.module';
import { Otp } from './otp.entity';
import { User } from './user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Otp]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    HttpModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'super-secret',
        signOptions: { expiresIn: '1h' },
      }),
    }),
    WalletsModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, JwtStrategy, RoleGuard, WalletProvisioningUtil],
  exports: [UsersService, RoleGuard, JwtStrategy, JwtModule, PassportModule],
})
export class UsersModule { }