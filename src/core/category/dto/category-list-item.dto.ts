import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/queries/dto';
import { DateFilterEnum } from '../../admin/enums/admin-filter.enum';

export class CategoryFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Search by category name',
    example: 'electronics',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by creation date',
    enum: DateFilterEnum,
    example: DateFilterEnum.THIS_MONTH,
  })
  @IsOptional()
  @IsEnum(DateFilterEnum)
  dateFilter?: DateFilterEnum;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: ['name', 'totalProducts', 'createdAt'],
    example: 'totalProducts',
  })
  @IsOptional()
  @IsString()
  sortBy?: 'name' | 'totalProducts' | 'createdAt';
}

