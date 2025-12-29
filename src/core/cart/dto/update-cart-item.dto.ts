import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCartItemDto {
  @ApiProperty({ description: 'Quantity', example: 2 })
  @IsInt()
  @IsPositive()
  @IsOptional()
  quantity?: number;

  @ApiProperty({ description: 'Customer notes', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
