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
export class AppModule { }
