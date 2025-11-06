import { PageMetaDtoParameters } from '../../interfaces/pagination.interface';

export class PaginationMetadataDto {
  readonly page: number;
  readonly limit: number;
  readonly itemCount: number;
  readonly pageCount: number;
  readonly hasPreviousPage: boolean;
  readonly hasNextPage: boolean;

  constructor({ pageOptionsDto, itemCount }: PageMetaDtoParameters) {
    const { page, limit } = pageOptionsDto;

    this.page = Math.max(1, page);
    this.limit = Math.max(1, limit);
    this.itemCount = Math.max(0, itemCount);

    this.pageCount = Math.ceil(this.itemCount / this.limit) || 1;
    this.hasPreviousPage = this.page > 1;
    this.hasNextPage = this.page < this.pageCount;
  }
}
