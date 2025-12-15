import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { BusinessesService } from "../businesses/businesses.service";
import { UsersService } from "../users/users.service";
import { Admin } from "../../common/decorators/admin.decorator";
import { ApiBearerAuth, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { MerchantFilterDto } from "../businesses/dto/merchant-filter.dto";
import { MerchantsListResponseDto } from "../businesses/dto/merchants-list-response.dto";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { PaginationDto } from "../../common/queries/dto";
import { HttpResponse } from "../../common/utils/http-response.utils";
import { JwtAuthGuard, RoleGuard } from "../users";

@Admin()
@ApiBearerAuth()
@Controller('admin/merchants')
export class AdminMerchantsController {
  constructor(
    private readonly businessesService: BusinessesService,
    private readonly usersService: UsersService,
  ) { }
  @Get('users')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @RequirePermissions('*')
  @ApiOperation({
    summary: 'Get all merchant users',
    description: 'Retrieves all merchant users.',
  })
  @ApiResponse({ status: 200, description: 'Merchant users retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getMerchantUsers(
    @Query() pageOptionsDto: PaginationDto,
  ) {
    const result = await this.usersService.getMerchantUsers(pageOptionsDto);

    return HttpResponse.success({
      ...result,
      message: 'Merchant users retrieved successfully',
    });
  }


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
}