import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Admin } from "../../common/decorators/admin.decorator";
import { BusinessesService } from "../businesses/businesses.service";
import { MerchantFilterDto } from "../businesses/dto/merchant-filter.dto";
import { MerchantsListResponseDto } from "../businesses/dto/merchants-list-response.dto";
import { AdminService } from "../admin/admin.service";
import { MerchantMetricsResponse } from "../admin/dto/merchant-metrics.dto";

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

  @Get('metrics')
  @ApiOperation({
    summary: 'Get merchant metrics',
    description: 'Returns total, active, inactive, and recent active merchants with sales data.',
  })
  @ApiResponse({
    status: 200,
    description: 'Merchant metrics retrieved successfully',
    type: MerchantMetricsResponse,
  })
  async getMerchantMetrics(): Promise<MerchantMetricsResponse> {
    return this.adminService.merchantMetrics();
  }
}
