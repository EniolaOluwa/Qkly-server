import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetadataDto } from '../../../common/queries/dto';
import { CategoryListItemDto } from './category-product.dto';

export class CategoriesListResponseDto {
  @ApiProperty({
    description: 'List of categories with statistics',
    type: [CategoryListItemDto],
  })
  data: CategoryListItemDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetadataDto,
  })
  meta: PaginationMetadataDto;
}
