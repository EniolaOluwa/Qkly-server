import { Injectable } from '@nestjs/common';
import { CloudinaryUtil } from '../../common/utils/cloudinary.util';

@Injectable()
export class CloudinaryService {
  constructor(private readonly cloudinaryUtil: CloudinaryUtil) {}

  async uploadImage(file: Express.Multer.File) {
    if (!file) {
      throw new Error('Image file is required');
    }

    const uploaded = await this.cloudinaryUtil.uploadImage(file.buffer);
    return { url: uploaded.secure_url };
  }

  async deleteImage(publicId: string) {
    return await this.cloudinaryUtil.deleteImage(publicId);
  }
}
