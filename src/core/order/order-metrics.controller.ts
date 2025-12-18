import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger';
import { BusinessMetricsResponseDto, ErrorResponseDto } from './dto/order-metric.dto';
import { OrderMetricsService } from "./order-metric.service";

@ApiTags('Order Metrics')
@Controller('orders/metrics')
@ApiBearerAuth()
export class OrderMetricsController {
  constructor(private readonly orderMetricsService: OrderMetricsService) { }
  @Get('business/:businessId')
  @ApiOperation({
    summary: 'Get comprehensive order metrics for a specific business',
    description: `
      Retrieves detailed analytics and metrics for a business including:
      - Revenue and sales metrics
      - Order status breakdown
      - Payment analytics
      - Financial breakdown (subtotal, fees, taxes, discounts)
      - Settlement tracking
      - Refund analytics
      - Customer insights (new vs returning)
      - Top selling products
      - Delivery method distribution
      - Growth metrics (when date range is provided)
      
      This endpoint is designed for business owners to track their store performance.
    `,
  })
  @ApiParam({
    name: 'businessId',
    description: 'The unique identifier of the business',
    example: 42,
    type: Number,
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
    description: 'Successfully retrieved business metrics',
    type: BusinessMetricsResponseDto,
    schema: {
      example: {
        businessId: 42,
        businessName: 'Tech Store Lagos',
        totalRevenue: 2500000.50,
        totalOrders: 400,
        averageOrderValue: 6250.00,
        ordersByStatus: {
          pending: 15,
          confirmed: 32,
          processing: 45,
          shipped: 78,
          delivered: 120,
          completed: 98,
          cancelled: 8,
          returned: 3,
          refunded: 2,
        },
        paymentMetrics: {
          totalPaid: 2500000.50,
          totalPending: 150000.00,
          totalFailed: 25000.00,
          totalRefunded: 50000.00,
          paymentSuccessRate: 94.5,
        },
        financialBreakdown: {
          subtotal: 2400000.00,
          shippingFees: 75000.00,
          taxes: 180000.00,
          discounts: 50000.00,
          netRevenue: 2605000.00,
        },
        settlementMetrics: {
          totalSettled: 2300000.00,
          pendingSettlement: 200000.00,
          settlementRate: 92.0,
          averageSettlementAmount: 25000.00,
        },
        refundMetrics: {
          totalRefunded: 50000.00,
          refundCount: 5,
          refundRate: 1.2,
          averageRefundAmount: 10000.00,
        },
        customerMetrics: {
          totalCustomers: 450,
          newCustomers: 180,
          returningCustomers: 270,
          guestOrders: 85,
          registeredOrders: 315,
        },
        deliveryMetrics: {
          express: 120,
          standard: 250,
          pickup: 30,
        },
        topProducts: [
          {
            productId: 123,
            productName: 'Premium Leather Bag',
            totalQuantity: 450,
            totalRevenue: 4500000.00,
            orderCount: 89,
          },
          {
            productId: 124,
            productName: 'Designer Watch',
            totalQuantity: 280,
            totalRevenue: 3200000.00,
            orderCount: 67,
          },
        ],
        growthMetrics: {
          revenueGrowth: 15.5,
          orderGrowth: 12.3,
          previousPeriodRevenue: 2150000.00,
          previousPeriodOrders: 350,
        },
        conversionRate: 3.5,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid parameters',
    type: ErrorResponseDto,
    schema: {
      example: {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid date range provided',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Business not found',
    type: ErrorResponseDto,
    schema: {
      example: {
        statusCode: 404,
        error: 'Not Found',
        message: 'Business with ID 42 not found',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
    type: ErrorResponseDto,
    schema: {
      example: {
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Failed to retrieve business metrics',
      },
    },
  })
  async getBusinessMetrics(
    @Param('businessId', ParseIntPipe) businessId: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<BusinessMetricsResponseDto> {
    const dateRange = startDate && endDate
      ? {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      }
      : undefined;

    return this.orderMetricsService.getBusinessMetrics(businessId, dateRange);
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