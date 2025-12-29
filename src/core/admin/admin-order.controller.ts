import { Controller, Get, Param, ParseIntPipe, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Admin } from "../../common/decorators/admin.decorator";
import { AdminMetricsResponseDto, ErrorResponseDto } from "../order/dto/order-metric.dto";
import { OrderMetricsService } from "../order/order-metric.service";
import { OrderService } from "../order/order.service";
import { PaginationResultDto } from "../../common/queries/dto";
import { ApiAuth, ApiPaginatedResponse } from "../../common/swagger/api-decorators";
import { FindAllOrdersDto } from "../order/dto/filter-order.dto";
import { Order } from "../order/entity/order.entity";

@Admin()
@ApiTags('Admin Order Metics')
@ApiBearerAuth()
@Controller('admin/orders')
export class AdminOrderController {
  constructor(
    private readonly orderMetricsService: OrderMetricsService,
    private readonly orderService: OrderService,
  ) { }
  @Get('lists')
  @ApiAuth()
  @ApiPaginatedResponse(
    Order,
    'Find all orders with filtering and pagination (Admin only)',
    'Retrieves all orders with optional filters and pagination',
  )
  async findAllOrders(
    @Query() query: FindAllOrdersDto,
  ): Promise<PaginationResultDto<Order>> {
    return await this.orderService.findAllOrders(query);
  }


  @Get('metrics')
  @ApiOperation({
    summary: 'Get comprehensive platform-wide order metrics (Admin only)',
    description: `
      Retrieves detailed analytics and metrics for the entire platform including:
      - All metrics from business endpoint (aggregated across all businesses)
      - Platform-specific metrics:
        * Total and active business count
        * Platform fees collected
        * Average fees per order
      - Top performing businesses
      - Payment method distribution
      - Cross-business analytics
      
      This endpoint is designed for administrators to monitor platform performance.
      
      **Access**: Admin only
    `,
  })
  @ApiQuery({
    name: 'startDate',
    description: 'Start date for filtering metrics (ISO 8601 format). If not provided, all-time metrics are returned.',
    example: '2024-01-01T00:00:00.000Z',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'endDate',
    description: 'End date for filtering metrics (ISO 8601 format). Must be used with startDate.',
    example: '2024-12-31T23:59:59.999Z',
    required: false,
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved admin metrics',
    type: AdminMetricsResponseDto,
    schema: {
      example: {
        totalRevenue: 85000000.00,
        totalOrders: 12500,
        averageOrderValue: 6800.00,
        ordersByStatus: {
          pending: 450,
          confirmed: 890,
          processing: 1200,
          shipped: 2100,
          delivered: 4500,
          completed: 3000,
          cancelled: 250,
          returned: 80,
          refunded: 30,
        },
        paymentMetrics: {
          totalPaid: 85000000.00,
          totalPending: 4500000.00,
          totalFailed: 850000.00,
          totalRefunded: 1200000.00,
          paymentSuccessRate: 95.2,
        },
        financialBreakdown: {
          subtotal: 82000000.00,
          shippingFees: 2500000.00,
          taxes: 6150000.00,
          discounts: 1650000.00,
          netRevenue: 89000000.00,
        },
        settlementMetrics: {
          totalSettled: 78000000.00,
          pendingSettlement: 7000000.00,
          settlementRate: 91.8,
          averageSettlementAmount: 6500.00,
        },
        refundMetrics: {
          totalRefunded: 1200000.00,
          refundCount: 150,
          refundRate: 1.2,
          averageRefundAmount: 8000.00,
        },
        customerMetrics: {
          totalCustomers: 8500,
          newCustomers: 3200,
          returningCustomers: 5300,
          guestOrders: 2100,
          registeredOrders: 10400,
        },
        deliveryMetrics: {
          express: 3500,
          standard: 7800,
          pickup: 1200,
        },
        platformMetrics: {
          totalBusinesses: 156,
          activeBusinesses: 124,
          totalPlatformFees: 1275000.00,
          averagePlatformFeePerOrder: 102.00,
        },
        topBusinesses: [
          {
            businessId: 42,
            businessName: 'Tech Store Lagos',
            totalRevenue: 8500000.00,
            totalOrders: 320,
            averageOrderValue: 26562.50,
          },
          {
            businessId: 87,
            businessName: 'Fashion Hub Abuja',
            totalRevenue: 7200000.00,
            totalOrders: 450,
            averageOrderValue: 16000.00,
          },
        ],
        paymentMethodDistribution: {
          card: 7500,
          bankTransfer: 3200,
          wallet: 1200,
          ussd: 450,
          cashOnDelivery: 150,
        },
        topProducts: [
          {
            productId: 456,
            productName: 'iPhone 15 Pro Max',
            totalQuantity: 2100,
            totalRevenue: 95000000.00,
            orderCount: 1850,
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid parameters',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
    type: ErrorResponseDto,
    schema: {
      example: {
        statusCode: 403,
        error: 'Forbidden',
        message: 'Admin access required to view platform metrics',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
    type: ErrorResponseDto,
  })
  async getAdminMetrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<AdminMetricsResponseDto> {
    const dateRange = startDate && endDate
      ? {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      }
      : undefined;

    return this.orderMetricsService.getAdminMetrics(dateRange);
  }


  @Get('summary')
  @ApiOperation({
    summary: 'Get quick summary of platform metrics (Admin only)',
    description: 'Returns a condensed version of platform-wide key metrics',
  })
  @ApiResponse({
    status: 200,
    description: 'Quick summary of platform metrics',
    schema: {
      example: {
        totalRevenue: 85000000.00,
        totalOrders: 12500,
        totalBusinesses: 156,
        activeBusinesses: 124,
        platformFees: 1275000.00,
        topBusiness: {
          name: 'Tech Store Lagos',
          revenue: 8500000.00,
        },
      },
    },
  })
  async getAdminSummary() {
    const metrics = await this.orderMetricsService.getAdminMetrics();

    return {
      totalRevenue: metrics.totalRevenue,
      totalOrders: metrics.totalOrders,
      totalBusinesses: metrics.platformMetrics.totalBusinesses,
      activeBusinesses: metrics.platformMetrics.activeBusinesses,
      platformFees: metrics.platformMetrics.totalPlatformFees,
      topBusiness: metrics.topBusinesses?.[0] ? {
        name: metrics.topBusinesses[0].businessName,
        revenue: metrics.topBusinesses[0].totalRevenue,
      } : null,
    };
  }


  @Get('business/:businessId/summary')
  @ApiOperation({
    summary: 'Get quick summary metrics for a business',
    description: 'Returns a condensed version of key metrics for quick overview',
  })
  @ApiParam({
    name: 'businessId',
    description: 'The unique identifier of the business',
    example: 42,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Quick summary of key metrics',
    schema: {
      example: {
        totalRevenue: 2500000.50,
        totalOrders: 400,
        averageOrderValue: 6250.00,
        pendingOrders: 15,
        activeOrders: 155,
        completedOrders: 98,
        paymentSuccessRate: 94.5,
        topProduct: {
          name: 'Premium Leather Bag',
          revenue: 4500000.00,
        },
      },
    },
  })
  async getBusinessSummary(
    @Param('businessId', ParseIntPipe) businessId: number,
  ) {
    const metrics = await this.orderMetricsService.getBusinessMetrics(businessId);

    return {
      totalRevenue: metrics.totalRevenue,
      totalOrders: metrics.totalOrders,
      averageOrderValue: metrics.averageOrderValue,
      pendingOrders: metrics.ordersByStatus.pending,
      activeOrders:
        metrics.ordersByStatus.processing +
        metrics.ordersByStatus.shipped +
        metrics.ordersByStatus.confirmed,
      completedOrders: metrics.ordersByStatus.completed,
      paymentSuccessRate: metrics.paymentMetrics.paymentSuccessRate,
      topProduct: metrics.topProducts?.[0] ? {
        name: metrics.topProducts[0].productName,
        revenue: metrics.topProducts[0].totalRevenue,
      } : null,
    };
  }
}