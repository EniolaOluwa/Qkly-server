import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Business } from './business.entity';
import { BusinessType } from './business-type.entity';
import { User } from '../users/entity/user.entity';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';
import { CloudinaryUtil } from '../../common/utils/cloudinary.util';
import { UserProgressModule } from '../user-progress/user-progress.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Business, BusinessType, User]),
    ConfigModule,
    UserProgressModule
  ],
  controllers: [BusinessesController],
  providers: [BusinessesService, CloudinaryUtil],
  exports: [BusinessesService],
})
export class BusinessesModule { }
