import { PaginationDto } from '../queries/dto/page-options.dto';

export interface PageMetaDtoParameters {
  pageOptionsDto: PaginationDto;
  itemCount: number;
}
