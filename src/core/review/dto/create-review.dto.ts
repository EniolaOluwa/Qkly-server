import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
  Max,
  IsInt,
  IsOptional,
  IsArray,
  IsUrl,
  IsBoolean,
  IsEmail,
  MaxLength
} from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({
    description: 'Business ID',
    example: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  businessId: number;

  @ApiProperty({
    description: 'Product ID',
    example: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  productId: number;

  @ApiProperty({
    description: 'Order ID',
    example: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  orderId: number;

  @ApiProperty({
    description: 'Order Item ID - the specific item being reviewed',
    example: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  orderItemId: number;

  @ApiProperty({
    description: 'Review text',
    example: 'Great product, highly recommended!',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  review: string;

  @ApiProperty({
    description: 'Rating between 1-5',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(5)
  ratings: number;

  @ApiProperty({
    description: 'Optional array of image URLs for the review',
    example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  imageUrls?: string[];

  @ApiProperty({
    description: 'Set review visibility (defaults to true)',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  guestName?: string;

  @IsOptional()
  @IsEmail()
  guestEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  guestPhone?: string;
}

export class ReviewResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  businessId: number;

  @ApiProperty()
  productId: number;

  @ApiProperty()
  orderId: number;

  @ApiProperty()
  orderItemId: number;

  @ApiProperty()
  review: string;

  @ApiProperty()
  ratings: number;

  @ApiProperty()
  imageUrls: string[];

  @ApiProperty()
  isVisible: boolean;

  @ApiProperty()
  isVerifiedPurchase: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  product: {
    id: number;
    name: string;
    images: string[];
  };

  @ApiProperty()
  business: {
    id: number;
    businessName: string;
  };

  @ApiProperty()
  user: {
    id: number;
    firstName: string;
    lastName: string;
    profilePicture?: string;
  };
}

export class UpdateReviewDto {
  @ApiProperty({
    description: 'Review text',
    example: 'Updated: Great product, highly recommended!',
    required: false,
  })
  @IsOptional()
  @IsString()
  review?: string;

  @ApiProperty({
    description: 'Rating between 1-5',
    example: 4,
    minimum: 1,
    maximum: 5,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  ratings?: number;

  @ApiProperty({
    description: 'Array of image URLs for the review',
    example: ['https://example.com/newimage1.jpg'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  imageUrls?: string[];

  @ApiProperty({
    description: 'Set review visibility',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}


export class GuestReviewVerificationDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  orderReference: string;
}