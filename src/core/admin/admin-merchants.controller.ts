import { Controller, Get, Query, Param, ParseIntPipe } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Admin } from "../../common/decorators/admin.decorator";
import { BusinessesService } from "../businesses/businesses.service";
import { MerchantFilterDto } from "../businesses/dto/merchant-filter.dto";
import { MerchantsListResponseDto } from "../businesses/dto/merchants-list-response.dto";
import { AdminService } from "../admin/admin.service";
import { MerchantMetricsResponse, RecentMerchantMetricsQueryDto } from "../admin/dto/merchant-metrics.dto";
import { MerchantDetailsResponseDto } from "./dto/merchant-details.dto";

@ApiTags('Admin Merchants')
@Admin()
@ApiBearerAuth()
@Controller('admin/merchants')
export class AdminMerchantsController {
  constructor(
    private readonly businessesService: BusinessesService,
    private readonly adminService: AdminService,
  ) { }


  @Get('list')
  @ApiOperation({
    summary: 'Get paginated and filtered list of merchants',
    description: `
        Retrieves a paginated list of merchants with advanced filtering options:
        - Search by merchant name, store name, or owner email
        - Filter by business type
        - Filter by registration date (today, this week, last week, this month, last month, etc.)
        - Filter by subaccount status
        - Filter by location
        - Filter by revenue share percentage range
        - Filter by minimum orders or sales volume
      `,
  })
  @ApiResponse({
    status: 200,
    description: 'Merchants list retrieved successfully',
    type: MerchantsListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid query parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User does not have admin privileges',
  })
  async getMerchants(@Query() filterDto: MerchantFilterDto): Promise<MerchantsListResponseDto> {
    return this.businessesService.getMerchantsList(filterDto);
  }


  @Get('recent-merchant-metrics')
  @ApiOperation({
    summary: 'Get recent merchant metrics',
    description:
      'Returns recent active merchants with sales data, supports pagination, filtering, sorting, and search.',
  })
  @ApiResponse({
    status: 200,
    description: 'Recent merchant metrics retrieved successfully',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number for pagination (default 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page (default 10)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by firstName, lastName, email, or businessName' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'totalSales', 'salesVolume'], description: 'Field to sort by (default createdAt)' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'], description: 'Sort order (default DESC)' })
  @ApiQuery({ name: 'fromDate', required: false, type: String, description: 'Filter from this date (ISO string)' })
  @ApiQuery({ name: 'toDate', required: false, type: String, description: 'Filter up to this date (ISO string)' })
  async getMerchantMetrics(
    @Query() query: RecentMerchantMetricsQueryDto,
  ): Promise<any> {
    const queryWithDefaults = {
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      search: query.search,
      sortBy: query.sortBy ?? 'createdAt',
      sortOrder: query.sortOrder ?? 'DESC',
      fromDate: query.fromDate,
      toDate: query.toDate,
    };

    return this.adminService.recentMerchantMetrics(queryWithDefaults);
  }



  @Get('total-merchant-metrics')
  @ApiOperation({
    summary: 'Get merchant metrics',
    description: 'Returns total, active, inactive, and recent active merchants with sales data.',
  })
  @ApiResponse({
    status: 200,
    description: 'Merchant metrics retrieved successfully',
    type: MerchantMetricsResponse,
  })
  async gettotalMerchantMetrics(): Promise<MerchantMetricsResponse> {
    return this.adminService.totalMerchantMetrics();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get merchant details',
    description: 'Retrieves detailed information for a specific merchant by ID, including sales stats, KYC status, and wallet info.',
  })
  @ApiResponse({
    status: 200,
    description: 'Merchant details retrieved successfully',
    type: MerchantDetailsResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Merchant does not exist',
  })
  async getMerchantDetails(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MerchantDetailsResponseDto> {
    return this.businessesService.getMerchantDetails(id);
  }
}