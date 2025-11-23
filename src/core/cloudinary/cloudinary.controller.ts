import {
  BadRequestException,
  Controller,
  Delete,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CloudinaryService } from './cloudinary.service';
import { HttpResponse } from '../../common/utils/http-response.utils';

@ApiTags('Media Upload')
@ApiBearerAuth()
@Controller('media')
export class CloudinaryController {
  constructor(private readonly cloudinaryService: CloudinaryService) { }

  @Post('upload')
  @ApiOperation({ summary: 'Upload image to Cloudinary' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Image uploaded successfully',
    schema: {
      example: { url: 'https://res.cloudinary.com/.../image.jpg' },
    },
  })
  @ApiBadRequestResponse({ description: 'No file provided' })
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff'];
      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Supported formats: JPEG, JPG, PNG, GIF, WebP, BMP, TIFF'), false);
      }
    },
  }))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is required');

    const data = await this.cloudinaryService.uploadImage(file);

    return HttpResponse.success({
      data,
      message: 'Image Uploaded Successfully',
    });
  }

  // @Delete(':publicId')
  // @ApiOperation({ summary: 'Delete image from Cloudinary' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Image deleted successfully',
  // })
  // @ApiBadRequestResponse({ description: 'Invalid publicId or delete failed' })
  // async deleteImage(@Param('publicId') publicId: string) {
  //   await this.cloudinaryService.deleteImage(publicId);
  //   return HttpResponse.success({
  //     data: null,
  //     message: 'Image Uploaded Successfully',
  //   });
  // }
}
