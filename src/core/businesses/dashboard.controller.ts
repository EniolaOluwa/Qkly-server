import {
  Controller,
  Get,
  Query,
  UseGuards,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import {
  CompleteDashboardDto,
  DashboardMetricsDto,
  DashboardQueryDto,
  RecentOrderDto,
  BusinessTopProductDto,
  SalesChartDataDto,
  OrderStatusDistributionDto,
  PaymentMethodDistributionDto,
} from './dto/dashboard-response.dto';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { JwtAuthGuard } from '../users';
import { DashboardService } from './business-dashboard.service';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';


@ApiTags('Business Dashboard')
@Controller('business-dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) { }

  @Get(':businessId/complete')
  @ApiOperation({
    summary: 'Get complete dashboard data',
    description:
      'Retrieves all dashboard metrics, recent orders, top products, sales chart data, and distribution analytics in a single request. This is the most efficient endpoint for loading a complete dashboard view.',
  })
  @ApiParam({
    name: 'businessId',
    type: Number,
    description: 'Unique identifier of the business',
    example: 1,
  })
  @ApiQuery({
    name: 'startDate',
    type: Date,
    required: false,
    description: 'Start date for filtering data (ISO 8601 format)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'endDate',
    type: Date,
    required: false,
    description: 'End date for filtering data (ISO 8601 format)',
    example: '2024-12-31T23:59:59.999Z',
  })
  @ApiQuery({
    name: 'period',
    enum: ['today', 'week', 'month', 'year', 'all', 'custom'],
    required: false,
    description:
      'Predefined time period for data filtering. Use "all" for all-time data from inception, or "custom" with startDate and endDate for custom ranges.',
    example: 'month',
  })
  @ApiResponse({
    status: 200,
    description: 'Complete dashboard data retrieved successfully',
    type: CompleteDashboardDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Business not found or access denied',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  async getCompleteDashboard(
    @Param('businessId', ParseIntPipe) businessId: number,
    @CurrentUser('userId') userId: number,
    @Query() query: DashboardQueryDto,
  ): Promise<CompleteDashboardDto> {
    return this.dashboardService.getCompleteDashboard(businessId, userId, query);
  }

  @Get(':businessId/metrics')
  @ApiOperation({
    summary: 'Get dashboard metrics',
    description:
      'Retrieves comprehensive business metrics including orders, revenue, customers, products, traffic, and growth analytics. Includes period-over-period comparisons.',
  })
  @ApiParam({
    name: 'businessId',
    type: Number,
    description: 'Unique identifier of the business',
    example: 1,
  })
  @ApiQuery({
    name: 'startDate',
    type: Date,
    required: false,
    description: 'Start date for filtering metrics',
  })
  @ApiQuery({
    name: 'endDate',
    type: Date,
    required: false,
    description: 'End date for filtering metrics',
  })
  @ApiQuery({
    name: 'period',
    enum: ['today', 'week', 'month', 'year', 'all', 'custom'],
    required: false,
    description: 'Predefined time period (defaults to "month"). Use "all" for all-time data from inception.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard metrics retrieved successfully',
    type: DashboardMetricsDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Business not found or access denied',
  })
  async getMetrics(
    @Param('businessId', ParseIntPipe) businessId: number,
    @CurrentUser('userId') userId: number,
    @Query() query: DashboardQueryDto,
  ): Promise<DashboardMetricsDto> {
    await this.dashboardService.verifyBusinessOwnership(businessId, userId);
    const { startDate, endDate } = query?.startDate && query?.endDate
      ? { startDate: new Date(query.startDate), endDate: new Date(query.endDate) }
      : { startDate: undefined, endDate: undefined };
    return this.dashboardService.getMetrics(businessId, startDate, endDate);
  }

  @Get(':businessId/recent-orders')
  @ApiOperation({
    summary: 'Get recent orders',
    description:
      'Retrieves the most recent orders for the business, sorted by creation date in descending order. Useful for displaying a quick overview of latest activity.',
  })
  @ApiParam({
    name: 'businessId',
    type: Number,
    description: 'Unique identifier of the business',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Maximum number of orders to return',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Recent orders retrieved successfully',
    type: [RecentOrderDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Business not found or access denied',
  })
  async getRecentOrders(
    @Param('businessId', ParseIntPipe) businessId: number,
    @CurrentUser('userId') userId: number,
    @Query('limit') limit: number = 10,
  ): Promise<RecentOrderDto[]> {
    await this.dashboardService.verifyBusinessOwnership(businessId, userId);
    return this.dashboardService.getRecentOrders(businessId, limit);
  }

  @Get(':businessId/top-products')
  @ApiOperation({
    summary: 'Get top-performing products',
    description:
      'Retrieves the best-selling products ranked by revenue within the specified time period. Includes total orders, revenue generated, and current stock levels.',
  })
  @ApiParam({
    name: 'businessId',
    type: Number,
    description: 'Unique identifier of the business',
    example: 1,
  })
  @ApiQuery({
    name: 'startDate',
    type: Date,
    required: false,
    description: 'Start date for filtering product performance',
  })
  @ApiQuery({
    name: 'endDate',
    type: Date,
    required: false,
    description: 'End date for filtering product performance',
  })
  @ApiQuery({
    name: 'period',
    enum: ['today', 'week', 'month', 'year', 'all', 'custom'],
    required: false,
    description: 'Predefined time period. Use "all" for all-time data.',
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Maximum number of products to return',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Top products retrieved successfully',
    type: [BusinessTopProductDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Business not found or access denied',
  })
  async getTopProducts(
    @Param('businessId', ParseIntPipe) businessId: number,
    @CurrentUser('userId') userId: number,
    @Query() query: DashboardQueryDto,
    @Query('limit') limit: number = 10,
  ): Promise<BusinessTopProductDto[]> {
    await this.dashboardService.verifyBusinessOwnership(businessId, userId);
    const { startDate, endDate } = query?.startDate && query?.endDate
      ? { startDate: new Date(query.startDate), endDate: new Date(query.endDate) }
      : { startDate: undefined, endDate: undefined };
    return this.dashboardService.getTopProducts(businessId, startDate, endDate, limit);
  }

  @Get(':businessId/sales-chart')
  @ApiOperation({
    summary: 'Get sales chart data',
    description:
      'Retrieves daily sales data including order count and revenue for the specified period. Perfect for rendering line charts or bar charts showing sales trends over time.',
  })
  @ApiParam({
    name: 'businessId',
    type: Number,
    description: 'Unique identifier of the business',
    example: 1,
  })
  @ApiQuery({
    name: 'startDate',
    type: Date,
    required: false,
    description: 'Start date for sales chart data',
  })
  @ApiQuery({
    name: 'endDate',
    type: Date,
    required: false,
    description: 'End date for sales chart data',
  })
  @ApiQuery({
    name: 'period',
    enum: ['today', 'week', 'month', 'year', 'all', 'custom'],
    required: false,
    description: 'Predefined time period. Use "all" for all-time data.',
  })
  @ApiResponse({
    status: 200,
    description: 'Sales chart data retrieved successfully',
    type: [SalesChartDataDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Business not found or access denied',
  })
  async getSalesChart(
    @Param('businessId', ParseIntPipe) businessId: number,
    @CurrentUser('userId') userId: number,
    @Query() query: DashboardQueryDto,
  ): Promise<SalesChartDataDto[]> {
    await this.dashboardService.verifyBusinessOwnership(businessId, userId);
    const { startDate, endDate } = query?.startDate && query?.endDate
      ? { startDate: new Date(query.startDate), endDate: new Date(query.endDate) }
      : { startDate: undefined, endDate: undefined };
    return this.dashboardService.getSalesChartData(businessId, startDate, endDate);
  }

  @Get(':businessId/order-status-distribution')
  @ApiOperation({
    summary: 'Get order status distribution',
    description:
      'Retrieves the breakdown of orders by status (pending, processing, completed, cancelled) with counts and percentages. Useful for pie charts or status overview widgets.',
  })
  @ApiParam({
    name: 'businessId',
    type: Number,
    description: 'Unique identifier of the business',
    example: 1,
  })
  @ApiQuery({
    name: 'startDate',
    type: Date,
    required: false,
    description: 'Start date for filtering orders',
  })
  @ApiQuery({
    name: 'endDate',
    type: Date,
    required: false,
    description: 'End date for filtering orders',
  })
  @ApiQuery({
    name: 'period',
    enum: ['today', 'week', 'month', 'year', 'all', 'custom'],
    required: false,
    description: 'Predefined time period. Use "all" for all-time data.',
  })
  @ApiResponse({
    status: 200,
    description: 'Order status distribution retrieved successfully',
    type: [OrderStatusDistributionDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Business not found or access denied',
  })
  async getOrderStatusDistribution(
    @Param('businessId', ParseIntPipe) businessId: number,
    @CurrentUser('userId') userId: number,
    @Query() query: DashboardQueryDto,
  ): Promise<OrderStatusDistributionDto[]> {
    await this.dashboardService.verifyBusinessOwnership(businessId, userId);
    const { startDate, endDate } = query?.startDate && query?.endDate
      ? { startDate: new Date(query.startDate), endDate: new Date(query.endDate) }
      : { startDate: undefined, endDate: undefined };
    return this.dashboardService.getOrderStatusDistribution(businessId, startDate, endDate);
  }

  @Get(':businessId/payment-method-distribution')
  @ApiOperation({
    summary: 'Get payment method distribution',
    description:
      'Retrieves the breakdown of orders and revenue by payment method with counts, amounts, and percentages. Helps understand customer payment preferences.',
  })
  @ApiParam({
    name: 'businessId',
    type: Number,
    description: 'Unique identifier of the business',
    example: 1,
  })
  @ApiQuery({
    name: 'startDate',
    type: Date,
    required: false,
    description: 'Start date for filtering payments',
  })
  @ApiQuery({
    name: 'endDate',
    type: Date,
    required: false,
    description: 'End date for filtering payments',
  })
  @ApiQuery({
    name: 'period',
    enum: ['today', 'week', 'month', 'year', 'all', 'custom'],
    required: false,
    description: 'Predefined time period. Use "all" for all-time data.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment method distribution retrieved successfully',
    type: [PaymentMethodDistributionDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Business not found or access denied',
  })
  async getPaymentMethodDistribution(
    @Param('businessId', ParseIntPipe) businessId: number,
    @CurrentUser('userId') userId: number,
    @Query() query: DashboardQueryDto,
  ): Promise<PaymentMethodDistributionDto[]> {
    await this.dashboardService.verifyBusinessOwnership(businessId, userId);
    const { startDate, endDate } = query?.startDate && query?.endDate
      ? { startDate: new Date(query.startDate), endDate: new Date(query.endDate) }
      : { startDate: undefined, endDate: undefined };
    return this.dashboardService.getPaymentMethodDistribution(businessId, startDate, endDate);
  }

}