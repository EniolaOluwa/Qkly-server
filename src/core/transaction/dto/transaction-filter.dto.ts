import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsDateString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionStatus, TransactionType } from '../entity/transaction.entity';
import { PaginationDto } from '../../../common/queries/dto';

export class TransactionFilterDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search by reference, sender name, or recipient name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: TransactionStatus })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiPropertyOptional({ enum: TransactionType })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiPropertyOptional({ description: 'Filter by specific user ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;

  @ApiPropertyOptional({ description: 'Filter by specific business ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  businessId?: number;

  @ApiPropertyOptional({ description: 'Start date filter (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date filter (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Sort field', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sort?: string;
}
