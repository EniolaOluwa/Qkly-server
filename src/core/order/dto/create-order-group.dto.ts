// dto/create-order-group.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested
} from 'class-validator';
import { DeliveryMethod } from '../../../common/enums/order.enum';
import { OrderItemDto } from './create-order.dto';

export class CustomerInfoDto {
  @ApiProperty({ description: 'Customer name', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Customer email', example: 'john.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Customer phone number', example: '+2348012345678' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ description: 'Delivery address', example: '123 Main Street' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ description: 'State', example: 'Lagos' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiPropertyOptional({ description: 'City', example: 'Ikeja' })
  @IsString()
  @IsOptional()
  city?: string;
}

export class OrderDataDto {
  @ApiProperty({ description: 'Business ID', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  businessId: number;

  @ApiProperty({ description: 'Delivery method', enum: DeliveryMethod })
  @IsEnum(DeliveryMethod)
  @IsNotEmpty()
  deliveryMethod: DeliveryMethod;

  @ApiProperty({
    description: 'Order items',
    type: [OrderItemDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  @IsNotEmpty()
  items: OrderItemDto[];
}

export class CreateOrderGroupDto {
  @ApiProperty({
    description: 'Customer information',
    type: CustomerInfoDto
  })
  @IsObject()
  @ValidateNested()
  @Type(() => CustomerInfoDto)
  @IsNotEmpty()
  customerInfo: CustomerInfoDto;

  @ApiProperty({
    description: 'Orders in this group',
    type: [OrderDataDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderDataDto)
  @IsNotEmpty()
  orders: OrderDataDto[];
}