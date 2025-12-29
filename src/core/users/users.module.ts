import { HttpModule } from '@nestjs/axios';
import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtStrategy } from '../../common/auth/jwt.strategy';
import { RoleGuard } from '../../common/guards/role.guard';
import { WalletProvisioningUtil } from '../../common/utils/wallet-provisioning.util';
import { WalletsModule } from '../wallets/wallets.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { Otp } from './entity/otp.entity';
import { User } from './entity/user.entity';
import { UserProfile } from './entities/user-profile.entity';
import { UserKYC } from './entities/user-kyc.entity';
import { UserSecurity } from './entities/user-security.entity';
import { UserOnboarding } from './entities/user-onboarding.entity';
import { UsersController } from './users.controller';
import { Order } from '../order/entity/order.entity';
import { UsersService } from './users.service';
import { KycService } from './kyc.service';
import { UserProgressModule } from '../user-progress/user-progress.module';
import { Role } from '../roles/entities/role.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Otp, Order, Role, UserProfile, UserKYC, UserSecurity, UserOnboarding]),
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
    forwardRef(() => WalletsModule),
    CloudinaryModule,
    forwardRef(() => UserProgressModule),
  ],
  controllers: [UsersController],
  providers: [UsersService, KycService, JwtStrategy, RoleGuard, WalletProvisioningUtil],
  exports: [UsersService, KycService, RoleGuard, JwtStrategy, JwtModule, PassportModule],
})
export class UsersModule { }