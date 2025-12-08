import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString } from "class-validator";

export class CreateDeviceDto {
  @ApiProperty({
    description: 'User ID',
    example: 1,
  })
  userId: number;

  @ApiPropertyOptional({
    description: 'Business ID',
    example: 10,
  })
  @IsOptional()
  businessId?: number;

  @ApiProperty({
    description: 'Device name',
    example: 'iPhone 12',
  })
  @IsString()
  deviceName: string;

  @ApiPropertyOptional({
    description: 'Operating System Type',
    example: 'iOS',
  })
  @IsOptional()
  @IsString()
  osType?: string;

  @ApiPropertyOptional({
    description: 'Operating System Version',
    example: '14.0',
  })
  @IsOptional()
  @IsString()
  osVersion?: string;

  @ApiPropertyOptional({
    description: 'Device Type',
    example: 'Mobile',
  })
  @IsOptional()
  @IsString()
  deviceType?: string;

  @ApiPropertyOptional({
    description: 'Referral URL',
    example: 'https://example.com',
  })
  @IsOptional()
  @IsString()
  referralUrl?: string;
}


export class UpdateDeviceDto {
  @ApiPropertyOptional({
    description: 'Device name',
    example: 'iPhone 12',
  })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({
    description: 'Operating System Type',
    example: 'iOS',
  })
  @IsOptional()
  @IsString()
  osType?: string;

  @ApiPropertyOptional({
    description: 'Operating System Version',
    example: '14.0',
  })
  @IsOptional()
  @IsString()
  osVersion?: string;

  @ApiPropertyOptional({
    description: 'Device Type',
    example: 'Mobile',
  })
  @IsOptional()
  @IsString()
  deviceType?: string;

  @ApiPropertyOptional({
    description: 'Referral URL',
    example: 'https://example.com',
  })
  @IsOptional()
  @IsString()
  referralUrl?: string;

  // 🔥 New businessId field
  @ApiPropertyOptional({
    description: 'Business ID linked to this device',
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  businessId?: number;
}