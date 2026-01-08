import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/queries/dto/page-options.dto';

export class StoreFrontStoreQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Search term for store name or business name',
    required: false,
    example: 'tech'
  })
  @IsOptional()
  @IsString()
  readonly search?: string;
}
