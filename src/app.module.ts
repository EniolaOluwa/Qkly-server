import { Module } from '@nestjs/common';
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
      synchronize: false, // Set to false when using migrations
      migrationsRun: true, // Set to true to run migrations on app start
      logging: false, // Disabled database query logging
    }),
    UsersModule,
    ProductModule,
    OrderModule,
    BusinessesModule,
    WalletsModule,
    ReviewModule,
  ],
  controllers: [AppController],
  providers: [
    AppService
  ],
})

export class AppModule {}