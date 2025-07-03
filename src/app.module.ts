import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './user.entity';
import { Business } from './business.entity';
import { BusinessType } from './business-type.entity';
import { UsersModule } from './users/users.module';
import { BusinessTypesModule } from './business-types/business-types.module';

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
      entities: [User, Business, BusinessType],
      synchronize: process.env.NODE_ENV === 'development', // Only in development
      logging: process.env.NODE_ENV === 'development',
    }),
    TypeOrmModule.forFeature([Business]),
    UsersModule,
    BusinessTypesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
