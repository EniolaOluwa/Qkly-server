import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export enum PaginationOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class PaginationDto {
  @ApiPropertyOptional({
    enum: PaginationOrder,
    description: 'The order of sorting, either ASC or DESC.',
    default: PaginationOrder.DESC,
  })
  @IsEnum(PaginationOrder)
  @IsOptional()
  readonly order: PaginationOrder = PaginationOrder.DESC;

  @ApiPropertyOptional({
    type: Number,
    description: 'The page number (minimum 1).',
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  readonly page: number = 1;

  @ApiPropertyOptional({
    type: Number,
    description: 'The number of items per page (minimum 1, maximum 50).',
    default: 50,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  readonly limit: number = 50;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}
