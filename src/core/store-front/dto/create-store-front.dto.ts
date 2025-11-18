import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateStoreFrontDto {
  @ApiProperty({
    description: 'Store name',
    example: "Success's Clothings",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  storeName: string;

  @ApiProperty({
    description: 'Hero text for the store',
    example: 'Welcome to our store!',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  heroText: string;

  @ApiProperty({
    description: 'Store color in hex format',
    example: '#FF0000',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Store color must be a valid hex color code (e.g., #FF0000)',
  })
  storeColor: string;

  @ApiPropertyOptional({
    description: 'Array of category names',
    example: ['Joggers', 'Dress'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
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
