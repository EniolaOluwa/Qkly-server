import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './core/admin/admin.module';
import { BusinessesModule } from './core/businesses/businesses.module';
import { CategoryModule } from './core/category/category.module';
import { CloudinaryModule } from './core/cloudinary/cloudinary.module';
import { LeadModule } from './core/lead/lead.module';
import { OrderModule } from './core/order/order.module';
import { PaymentModule } from './core/payment/payment.module';
import { ProductModule } from './core/product/product.module';
import { ReviewModule } from './core/review/review.module';
import { RolesModule } from './core/roles/roles.module';
import { StoreFrontModule } from './core/store-front/store-front.module';
import { TrafficModule } from './core/traffic-events/traffic.module';
import { TransactionService } from './core/transaction/transaction.service';
import { UserProgressModule } from './core/user-progress/user-progress.module';
import { JwtAuthGuard } from './core/users';
import { UsersModule } from './core/users/users.module';
import { WalletsModule } from './core/wallets/wallets.module';
import { dataSource } from './database';
import { SeedModule } from './database/seeds/seed.module';


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
    CloudinaryModule,
    StoreFrontModule,
    TrafficModule,
    UserProgressModule,
    AdminModule,
    RolesModule,
    SeedModule
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD, // global guard for all modules
      useFactory: (reflector: Reflector) => new JwtAuthGuard(reflector),
      inject: [Reflector],
    },
    AppService,
    TransactionService,
  ],
})


export class AppModule { }