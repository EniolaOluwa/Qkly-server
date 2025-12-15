import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Admin } from "../../common/decorators/admin.decorator";
import { HttpResponse } from "../../common/utils/http-response.utils";
import { AdminService } from "./admin.service";
import { DashboardStatsDto } from "./dto/dashboard-stats.dto";

@Admin()
@ApiBearerAuth()
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly adminService: AdminService) { }

  @Get('stats')
  @ApiOperation({
    summary: 'Get dashboard statistics',
    description:
      'Retrieves overall platform statistics including total orders, merchants, products, categories, and transactions',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics retrieved successfully',
    type: DashboardStatsDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User does not have admin privileges',
  })
  async getDashboardStats(): Promise<DashboardStatsDto> {
    return this.adminService.getDashboardStats();
  }


  @Get('admin-stats')
  @ApiOperation({
    summary: 'Get admin statistics',
    description: 'Retrieves comprehensive statistics about admin users.',
  })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getAdminStatistics() {
    const statistics = await this.adminService.getAdminStatistics();

    return HttpResponse.success({
      message: 'Admin statistics retrieved successfully',
      data: statistics,
    });
  }
}