import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Business } from './business.entity';
import { BusinessType } from './business-type.entity';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';
import { CloudinaryUtil } from '../utils/cloudinary.util';

@Module({
  imports: [
    TypeOrmModule.forFeature([Business, BusinessType]),
    ConfigModule,
  ],
  controllers: [BusinessesController],
  providers: [BusinessesService, CloudinaryUtil],
  exports: [BusinessesService],
})
export class BusinessesModule {}
