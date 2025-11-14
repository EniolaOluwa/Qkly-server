import { Module } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './core/users/users.module';
import { BusinessesModule } from './core/businesses/businesses.module';
import { WalletsModule } from './core/wallets/wallets.module';
import { ReviewModule } from './core/store/review.module';
import { ProductModule } from './core/product/product.module';
import { OrderModule } from './core/order/order.module';
import { dataSource } from './database';
import { JwtAuthGuard } from './core/users';
import { JwtStrategy } from './common/auth/jwt.strategy';
import { PassportModule } from '@nestjs/passport';
import { CategoryModule } from './core/category/category.module';
import { AdminController } from './core/admin/admin.controller';
import { LeadModule } from './core/lead/lead.module';
import { EmailModule } from './core/email/email.module';


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
    EmailModule,
    BusinessesModule,
    WalletsModule,
    ReviewModule,
    LeadModule,
    CategoryModule,
  ],
  controllers: [AppController, AdminController],
  providers: [
    {
      provide: APP_GUARD, // global guard for all modules
      useFactory: (reflector: Reflector) => new JwtAuthGuard(reflector),
      inject: [Reflector],
    },
    AppService,
  ],
})
export class AppModule { }