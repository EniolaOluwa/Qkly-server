import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, Min, Max, IsInt } from 'class-validator';

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
    description: 'Review text',
    example: 'Great product, highly recommended!',
  })
  @IsNotEmpty()
  @IsString()
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
}
