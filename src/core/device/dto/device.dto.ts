import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { TrafficSource } from '../types/traffic-source.types';


export class RecordTrafficDto {
  @ApiPropertyOptional({
    description:
      'The referrer URL captured from JavaScript (document.referrer). ' +
      'Used when the HTTP Referer header is missing.',
    example: 'https://instagram.com/someprofile',
  })
  @IsOptional()
  @IsString()
  referrerFromJs?: string;

  @ApiPropertyOptional({
    description:
      'The landing page URL the visitor first arrived on within your site/app.',
    example: '/product/123',
  })
  @IsOptional()
  @IsString()
  landingPage?: string;

  @ApiPropertyOptional({
    description:
      'Value from UTM source if passed in the URL. Used to detect marketing campaigns.',
    example: 'instagram',
  })
  @IsOptional()
  @IsString()
  utmSource?: string;
}


export class AdminTrafficFilterDto {
  @ApiPropertyOptional({ enum: TrafficSource })
  @IsOptional()
  @IsEnum(TrafficSource)
  source?: TrafficSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessId?: number;

  @ApiPropertyOptional({ description: 'Start date YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  limit?: number = 20;
}
