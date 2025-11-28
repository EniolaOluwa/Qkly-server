import { IsArray } from 'class-validator';
import { PaginationMetadataDto } from './page-meta.dto';
import { PaginationDto } from './page-options.dto';

export class PaginationResultDto<T> {
  @IsArray()
  readonly data: T[];

  readonly meta: PaginationMetadataDto;

  constructor(
    data: T[],
    params: {
      itemCount: number;
      pageOptionsDto: PaginationDto;
    },
  ) {
    const n = new PaginationMetadataDto(params);
    this.data = data;
    this.meta = n;
  }
}
