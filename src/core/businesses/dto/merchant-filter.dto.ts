import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, IsString, IsNumber, IsEnum, IsDateString } from "class-validator";
import { PaginationDto } from "../../../common/queries/dto";
import { DateFilterEnum, SubaccountStatusEnum } from "../../admin/enums/admin-filter.enum";

export class MerchantFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Search by merchant name, store name, or owner email',
    example: 'fashion',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by business type ID',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  businessTypeId?: number;

  @ApiPropertyOptional({
    description: 'Filter by registration date period',
    enum: DateFilterEnum,
    example: DateFilterEnum.THIS_MONTH,
  })
  @IsOptional()
  @IsEnum(DateFilterEnum)
  dateFilter?: DateFilterEnum;

  @ApiPropertyOptional({
    description: 'Custom start date (required if dateFilter is CUSTOM)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  customStartDate?: string;

  @ApiPropertyOptional({
    description: 'Custom end date (required if dateFilter is CUSTOM)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  customEndDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by subaccount status',
    enum: SubaccountStatusEnum,
    example: SubaccountStatusEnum.ACTIVE,
  })
  @IsOptional()
  @IsEnum(SubaccountStatusEnum)
  subaccountStatus?: SubaccountStatusEnum;

  @ApiPropertyOptional({
    description: 'Filter by location/state',
    example: 'Lagos',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: 'Minimum revenue share percentage',
    example: 90,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minRevenueShare?: number;

  @ApiPropertyOptional({
    description: 'Maximum revenue share percentage',
    example: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxRevenueShare?: number;

  @ApiPropertyOptional({
    description: 'Minimum order count',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minOrders?: number;

  @ApiPropertyOptional({
    description: 'Minimum sales volume',
    example: 100000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minSalesVolume?: number;
}
