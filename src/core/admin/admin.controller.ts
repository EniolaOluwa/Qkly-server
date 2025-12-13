import { Body, Controller, Delete, Get, Logger, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Admin } from '../../common/decorators/admin.decorator';
import { BusinessesService } from '../businesses/businesses.service';
import { MerchantFilterDto } from '../businesses/dto/merchant-filter.dto';
import { MerchantsListResponseDto } from '../businesses/dto/merchants-list-response.dto';
import { CategoryService } from '../category/category.service';
import { CategoriesListResponseDto } from '../category/dto/categories-list-response.dto';
import { CategoryDetailDto } from '../category/dto/category-detail.dto';
import { CategoryFilterDto } from '../category/dto/category-list-item.dto';
import { CategoryStatsDto } from '../category/dto/category-stats.dto';
import { AdminTrafficFilterDto } from '../traffic-events/dto/device.dto';
import { TrafficEventService } from '../traffic-events/traffic.service';
import { AdminService } from './admin.service';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';
import { HttpResponse } from '../../common/utils/http-response.utils';
import { CreateCategoryDto } from '../category/dto/create-category.dto';
import { UpdateCategoryDto } from '../category/dto/update-category.dto';


@Admin()
@Controller('admin')
@ApiBearerAuth()
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly categoryService: CategoryService,
    private readonly trafficService: TrafficEventService,
    private readonly adminService: AdminService,
    private readonly businessesService: BusinessesService
  ) { }

  @Get('/business-traffic')
  @ApiOperation({
    summary: 'Admin: Query all traffic events',
    description:
      'Full filtering: source, businessId, date ranges, pagination.',
  })
  async getAll(@Query() filters: AdminTrafficFilterDto) {
    return this.trafficService.adminQuery(filters);
  }



  @Get('dashboard/stats')
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


  @Get('merchants')
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


  @ApiBearerAuth()
  @Post('categories/create')
  async create(@Body() createDto: CreateCategoryDto) {
    const data = await this.categoryService.create(createDto);
    return HttpResponse.success({
      data,
      message: 'Categories Created successfully',
      statusCode: 201
    });
  }


  @Get('categories/stats')
  @ApiOperation({
    summary: 'Get category statistics',
    description: 'Retrieves category statistics including total categories, new categories this month, and total products',
  })
  @ApiResponse({
    status: 200,
    description: 'Category statistics retrieved successfully',
    type: CategoryStatsDto,
  })
  async getCategoryStats(): Promise<CategoryStatsDto> {
    return this.categoryService.getCategoryStats();
  }

  @Get('categories')
  @ApiOperation({
    summary: 'Get paginated list of categories',
    description: 'Retrieves a paginated list of all categories with product counts, business counts, and filtering options',
  })
  @ApiResponse({
    status: 200,
    description: 'Categories list retrieved successfully',
    type: CategoriesListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid query parameters',
  })
  async getCategories(
    @Query() filterDto: CategoryFilterDto,
  ): Promise<CategoriesListResponseDto> {
    return this.categoryService.getCategoriesList(filterDto);
  }

  @Get('categories/:id')
  @ApiOperation({
    summary: 'Get category details with products',
    description: 'Retrieves detailed information about a specific category including all products under it',
  })
  @ApiResponse({
    status: 200,
    description: 'Category details retrieved successfully',
    type: CategoryDetailDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
  })
  async getCategoryDetail(@Param('id') id: number): Promise<CategoryDetailDto> {
    return this.categoryService.getCategoryDetail(id);
  }

  @Put('categories/:id')
  @ApiBearerAuth()
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateCategoryDto) {
    const data = await this.categoryService.update(id, updateDto);
    return HttpResponse.success({
      data,
      message: 'Category updated successfully',
      statusCode: 200
    });
  }


  @ApiBearerAuth()
  @Delete('categories/:id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.categoryService.remove(id);
    return HttpResponse.success({
      data: null,
      message: 'Category deleted successfully',
      statusCode: 204
    });
  }
}