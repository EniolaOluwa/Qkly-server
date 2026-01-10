import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateAddressDto {
  @ApiProperty({ description: 'Name of the recipient or sender' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Phone number' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ description: 'Full address string' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ description: 'Latitude', required: false })
  @IsOptional()
  latitude?: number;

  @ApiProperty({ description: 'Longitude', required: false })
  @IsOptional()
  longitude?: number;
}

export class ShippingItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNotEmpty()
  unit_weight: number;

  @IsNotEmpty()
  unit_amount: number;

  @IsNotEmpty()
  quantity: number;
}

export class FetchRatesDto {
  @IsNotEmpty()
  sender_address_code: string;

  @IsNotEmpty()
  reciever_address_code: string;

  @IsString()
  @IsNotEmpty()
  pickup_date: string; // yyyy-mm-dd

  @IsNotEmpty()
  category_id: number;

  @IsNotEmpty()
  items: ShippingItemDto[];
}

export class CreateLabelDto {
  @IsString()
  @IsNotEmpty()
  request_token: string;

  @IsString()
  @IsNotEmpty()
  service_code: string;

  @IsString()
  @IsNotEmpty()
  courier_id: string;
}
