import { PartialType } from '@nestjs/mapped-types';
import { CreateStoreFrontDto } from './create-store-front.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateStoreFrontDto extends PartialType(CreateStoreFrontDto) {
  @ApiPropertyOptional({
    description: 'Store name',
    example: "Success's Clothings",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  storeName?: string;

  @ApiPropertyOptional({
    description: 'Hero text for the store',
    example: 'Welcome to our store!',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  heroText?: string;

  @ApiPropertyOptional({
    description: 'Store color in hex format',
    example: '#FF0000',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Store color must be a valid hex color code (e.g., #FF0000)',
  })
  storeColor?: string;

  @ApiPropertyOptional({
    description: 'Array of category names',
    example: ['Joggers', 'Dress'],
    type: [String],
  })
  @IsOptional()
  categoryName?: string[];

  @ApiPropertyOptional({
    description: 'Cover image file (JPEG, PNG, GIF, WebP, BMP, TIFF supported)',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  coverImage?: Express.Multer.File;

  @ApiPropertyOptional({
    description: 'Array of category image files',
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
  })
  @IsOptional()
  categoryImages?: Express.Multer.File[];
}
