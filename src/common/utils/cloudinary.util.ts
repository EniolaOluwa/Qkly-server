import { v2 as cloudinary } from 'cloudinary';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CloudinaryUtil {
  constructor(private configService: ConfigService) {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  /**
   * Upload an image to Cloudinary
   * @param imageData - Base64 image data or buffer
   * @param folder - Optional folder name in Cloudinary (default: 'business-logos')
   * @returns Promise containing the upload result with secure_url
   */
  async uploadImage(
    imageData: string | Buffer,
    folder: string = 'Qkly/business_logo',
  ): Promise<{
    public_id: string;
    secure_url: string;
    url: string;
    format: string;
    width: number;
    height: number;
    bytes: number;
  }> {
    try {
      // Convert buffer to base64 if needed
      let dataToUpload: string;

      if (Buffer.isBuffer(imageData)) {
        dataToUpload = `data:image/jpeg;base64,${imageData.toString('base64')}`;
      } else if (typeof imageData === 'string') {
        // Assume it's already base64 encoded
        if (!imageData.startsWith('data:')) {
          dataToUpload = `data:image/jpeg;base64,${imageData}`;
        } else {
          dataToUpload = imageData;
        }
      } else {
        throw new Error('Invalid image data format');
      }

      const result = await cloudinary.uploader.upload(dataToUpload, {
        folder,
        resource_type: 'image',
        transformation: [
          {
            width: 500,
            height: 500,
            crop: 'limit',
            quality: 'auto',
            fetch_format: 'auto',
          },
        ],
      });

      return {
        public_id: result.public_id,
        secure_url: result.secure_url,
        url: result.url,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
      };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new InternalServerErrorException('Failed to upload image to cloud storage');
    }
  }

  /**
   * Delete an image from Cloudinary
   * @param publicId - The public ID of the image to delete
   * @returns Promise containing the deletion result
   */
  async deleteImage(publicId: string): Promise<{ result: string }> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      throw new InternalServerErrorException('Failed to delete image from cloud storage');
    }
  }

  /**
   * Generate a transformation URL for an existing image
   * @param publicId - The public ID of the image
   * @param transformations - Cloudinary transformation options
   * @returns The transformed image URL
   */
  generateUrl(publicId: string, transformations?: Record<string, any>): string {
    return cloudinary.url(publicId, transformations);
  }
}
