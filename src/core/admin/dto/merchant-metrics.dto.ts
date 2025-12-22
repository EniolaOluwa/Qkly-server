import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsNumber, Min, IsString, IsIn, IsDateString } from 'class-validator';

export class RecentMerchantWithSales {
  @ApiProperty({ example: 1, description: 'Unique identifier of the merchant' })
  id: number;

  @ApiProperty({ example: 'John', description: 'First name of the merchant' })
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Last name of the merchant' })
  lastName: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email address of the merchant',
  })
  email: string;

  @ApiProperty({
    example: '2348012345678',
    description: 'Phone number of the merchant',
  })
  phone: string;

  @ApiProperty({
    example: 'John Doe Stores',
    description: 'Business name of the merchant',
  })
  businessName: string;

  @ApiProperty({
    example: 1500.75,
    description: 'Total sales amount for the merchant',
  })
  totalSales: number;

  @ApiProperty({
    example: 25,
    description: 'Total number of sales for the merchant',
  })
  salesVolume: number;

  @ApiProperty({
    example: new Date(),
    description: 'Date when the merchant account was created',
  })
  dateCreated: Date;
}

export class MerchantMetricsResponse {
  @ApiProperty({ example: 100, description: 'Total number of merchants' })
  totalMerchants: number;

  @ApiProperty({ example: 80, description: 'Total number of active merchants' })
  activeMerchants: number;

  @ApiProperty({
    example: 20,
    description: 'Total number of inactive merchants',
  })
  inactiveMerchants: number;

}
export class RecentMerchantMetricsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['createdAt', 'totalSales', 'salesVolume'])
  sortBy?: 'createdAt' | 'totalSales' | 'salesVolume' = 'createdAt';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
