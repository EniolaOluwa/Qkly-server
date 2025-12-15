import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsDateString } from 'class-validator';

export class SuspendUserDto {
  @ApiProperty({ example: 'Violation of terms of service' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({
    example: '2024-12-31T23:59:59Z',
    description: 'Date until user is suspended. Leave empty for indefinite suspension',
  })
  @IsDateString()
  @IsOptional()
  suspendedUntil?: string;
}
