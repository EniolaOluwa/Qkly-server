import { Module } from '@nestjs/common';
import { CloudinaryUtil } from '../../common/utils/cloudinary.util';
import { CloudinaryController } from './cloudinary.controller';
import { CloudinaryService } from './cloudinary.service';

@Module({
  providers: [CloudinaryService, CloudinaryUtil],
  controllers: [CloudinaryController],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}
