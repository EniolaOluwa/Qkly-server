import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './core/users/user.entity';
import { Business } from './core/businesses/business.entity';
import { BusinessType } from './core/businesses/business-type.entity';
import { Otp } from './core/users/otp.entity';
import { Order } from './core/store/order.entity';
import { Product } from './core/store/product.entity';
import { UsersModule } from './core/users/users.module';
import { BusinessesModule } from './core/businesses/businesses.module';
import { WalletsModule } from './core/wallets/wallets.module';
import { StoreModule } from './core/store/store.module';
import { ProductSize } from './core/store/productSize.entity';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/auth/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '6543', 10),
      username: process.env.DB_USERNAME || 'eniolafakeye',
      password: process.env.DB_PASSWORD || 'password@12345',
      database: process.env.DB_NAME || 'nqkly_db',
      // entities: [User, Business, BusinessType, Otp, Order, Product, ProductSize],
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      migrations: ['dist/migrations/*.js'],
      synchronize: true, // Set to false when using migrations
      migrationsRun: true, // Set to true to run migrations on app start
      logging: false, // Disabled database query logging
    }),
    UsersModule,
    BusinessesModule,
    WalletsModule,
    StoreModule,
  ],
  controllers: [AppController],
  providers: [
    AppService
  ],
})
export class AppModule {}
