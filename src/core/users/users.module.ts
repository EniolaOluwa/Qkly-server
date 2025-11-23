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
import { Otp } from './entity/otp.entity';
import { User } from './entity/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { BusinessesModule } from '../businesses/businesses.module';
import { Business } from '../businesses/business.entity';
import { EmailModule } from '../email/email.module';
import { InsightsModule } from '../insights/insights.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Otp]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    HttpModule,
    EmailModule,
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