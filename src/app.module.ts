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
import { dataSource } from './database';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        return {};
      },
      dataSourceFactory: () => dataSource.initialize(),
    }),
    UsersModule,
    BusinessesModule,
    WalletsModule,
    StoreModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
