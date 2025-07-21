import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './users/user.entity';
import { Business } from './businesses/business.entity';
import { BusinessType } from './businesses/business-type.entity';
import { Otp } from './users/otp.entity';
import { Order } from './store/order.entity';
import { Product } from './store/product.entity';
import { UsersModule } from './users/users.module';
import { BusinessesModule } from './businesses/businesses.module';
import { WalletsModule } from './wallets/wallets.module';
import { StoreModule } from './store/store.module';

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
      entities: [User, Business, BusinessType, Otp, Order, Product],
      migrations: ['dist/migrations/*.js'],
      synchronize: false, // Set to false when using migrations
      migrationsRun: false, // Set to true to run migrations on app start
      logging: process.env.NODE_ENV === 'development',
    }),
    UsersModule,
    BusinessesModule,
    WalletsModule,
    StoreModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
