import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './core/admin/admin.module';
import { AuditInterceptor } from './core/audit/audit.interceptor';
import { AuditModule } from './core/audit/audit.module';
import { BusinessesModule } from './core/businesses/businesses.module';
import { CartModule } from './core/cart/cart.module';
import { CategoryModule } from './core/category/category.module';
import { CloudinaryModule } from './core/cloudinary/cloudinary.module';
import { LeadModule } from './core/lead/lead.module';
import { NotificationModule } from './core/notifications/notification.module';
import { OrderModule } from './core/order/order.module';
import { PaymentModule } from './core/payment/payment.module';
import { ProductModule } from './core/product/product.module';
import { ReviewModule } from './core/review/review.module';
import { RolesModule } from './core/roles/roles.module';
import { StoreFrontModule } from './core/store-front/store-front.module';
import { TrafficModule } from './core/traffic-events/traffic.module';
import { TransactionModule } from './core/transaction/transaction.module';
import { TransferModule } from './core/transfers/transfer.module';
import { UserProgressModule } from './core/user-progress/user-progress.module';
import { JwtAuthGuard } from './core/users';
import { UsersModule } from './core/users/users.module';
import { WalletsModule } from './core/wallets/wallets.module';
import { dataSource } from './database';
import { SeedModule } from './database/seeds/seed.module';
import { SystemConfigModule } from './core/system-config/system-config.module';



@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({}),
      dataSourceFactory: () => dataSource.initialize(),
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    UsersModule,
    ProductModule,
    OrderModule,
    BusinessesModule,
    WalletsModule,
    ReviewModule,
    LeadModule,
    CategoryModule,
    PaymentModule,
    CartModule,
    CloudinaryModule,
    StoreFrontModule,
    TrafficModule,
    UserProgressModule,
    AdminModule,
    RolesModule,
    RolesModule,
    SeedModule,
    SystemConfigModule,
    NotificationModule,
    AuditModule,
    TransactionModule,
    TransferModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD, // global guard for all modules
      useFactory: (reflector: Reflector) => new JwtAuthGuard(reflector),
      inject: [Reflector],
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    AppService,
  ],
})


export class AppModule { }