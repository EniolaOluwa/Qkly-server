import { ApiProperty } from '@nestjs/swagger';
import { MerchantStatsDto } from './merchant-stats.dto';
import { PaginationMetadataDto } from '../../../common/queries/dto';

export class MerchantsListResponseDto {
  @ApiProperty({
    description: 'List of merchants with their statistics',
    type: [MerchantStatsDto],
  })
  data: MerchantStatsDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetadataDto,
  })
  meta: PaginationMetadataDto;
}

