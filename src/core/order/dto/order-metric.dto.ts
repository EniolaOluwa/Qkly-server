import {
  ApiProperty
} from '@nestjs/swagger';

// ============================================================
// DTOs for Swagger Documentation
// ============================================================

export class DateRangeQueryDto {
  @ApiProperty({
    description: 'Start date for metrics calculation (ISO 8601 format)',
    example: '2024-01-01T00:00:00.000Z',
    required: false,
    type: String,
  })
  startDate?: string;

  @ApiProperty({
    description: 'End date for metrics calculation (ISO 8601 format)',
    example: '2024-12-31T23:59:59.999Z',
    required: false,
    type: String,
  })
  endDate?: string;
}

export class OrdersByStatusDto {
  @ApiProperty({ example: 15, description: 'Number of pending orders' })
  pending: number;

  @ApiProperty({ example: 32, description: 'Number of confirmed orders' })
  confirmed: number;

  @ApiProperty({ example: 45, description: 'Number of processing orders' })
  processing: number;

  @ApiProperty({ example: 78, description: 'Number of shipped orders' })
  shipped: number;

  @ApiProperty({ example: 120, description: 'Number of delivered orders' })
  delivered: number;

  @ApiProperty({ example: 98, description: 'Number of completed orders' })
  completed: number;

  @ApiProperty({ example: 8, description: 'Number of cancelled orders' })
  cancelled: number;

  @ApiProperty({ example: 3, description: 'Number of returned orders' })
  returned: number;

  @ApiProperty({ example: 2, description: 'Number of refunded orders' })
  refunded: number;
}

export class PaymentMetricsDto {
  @ApiProperty({ example: 2500000.50, description: 'Total amount paid (NGN)' })
  totalPaid: number;

  @ApiProperty({ example: 150000.00, description: 'Total amount pending (NGN)' })
  totalPending: number;

  @ApiProperty({ example: 25000.00, description: 'Total amount failed (NGN)' })
  totalFailed: number;

  @ApiProperty({ example: 50000.00, description: 'Total amount refunded (NGN)' })
  totalRefunded: number;

  @ApiProperty({ example: 94.5, description: 'Payment success rate (percentage)' })
  paymentSuccessRate: number;
}

export class FinancialBreakdownDto {
  @ApiProperty({ example: 2400000.00, description: 'Total subtotal before fees (NGN)' })
  subtotal: number;

  @ApiProperty({ example: 75000.00, description: 'Total shipping fees (NGN)' })
  shippingFees: number;

  @ApiProperty({ example: 180000.00, description: 'Total taxes (NGN)' })
  taxes: number;

  @ApiProperty({ example: 50000.00, description: 'Total discounts applied (NGN)' })
  discounts: number;

  @ApiProperty({ example: 2605000.00, description: 'Net revenue after refunds (NGN)' })
  netRevenue: number;
}

export class SettlementMetricsDto {
  @ApiProperty({ example: 2300000.00, description: 'Total amount settled to businesses (NGN)' })
  totalSettled: number;

  @ApiProperty({ example: 200000.00, description: 'Total amount pending settlement (NGN)' })
  pendingSettlement: number;

  @ApiProperty({ example: 92.0, description: 'Settlement rate (percentage)' })
  settlementRate: number;

  @ApiProperty({ example: 25000.00, description: 'Average settlement amount per order (NGN)' })
  averageSettlementAmount: number;
}

export class RefundMetricsDto {
  @ApiProperty({ example: 50000.00, description: 'Total amount refunded (NGN)' })
  totalRefunded: number;

  @ApiProperty({ example: 5, description: 'Number of refunded orders' })
  refundCount: number;

  @ApiProperty({ example: 1.2, description: 'Refund rate (percentage)' })
  refundRate: number;

  @ApiProperty({ example: 10000.00, description: 'Average refund amount per order (NGN)' })
  averageRefundAmount: number;
}

export class CustomerMetricsDto {
  @ApiProperty({ example: 450, description: 'Total unique customers' })
  totalCustomers: number;

  @ApiProperty({ example: 180, description: 'New customers in this period' })
  newCustomers: number;

  @ApiProperty({ example: 270, description: 'Returning customers' })
  returningCustomers: number;

  @ApiProperty({ example: 85, description: 'Orders placed by guest users' })
  guestOrders: number;

  @ApiProperty({ example: 315, description: 'Orders placed by registered users' })
  registeredOrders: number;
}

export class DeliveryMetricsDto {
  @ApiProperty({ example: 120, description: 'Number of express deliveries' })
  express: number;

  @ApiProperty({ example: 250, description: 'Number of standard deliveries' })
  standard: number;

  @ApiProperty({ example: 30, description: 'Number of pickup orders' })
  pickup: number;

  @ApiProperty({ example: 3.5, description: 'Average delivery time in days', required: false })
  averageDeliveryTime?: number;
}

export class GrowthMetricsDto {
  @ApiProperty({ example: 15.5, description: 'Revenue growth compared to previous period (percentage)' })
  revenueGrowth: number;

  @ApiProperty({ example: 12.3, description: 'Order growth compared to previous period (percentage)' })
  orderGrowth: number;

  @ApiProperty({ example: 2150000.00, description: 'Revenue from previous period (NGN)' })
  previousPeriodRevenue: number;

  @ApiProperty({ example: 350, description: 'Order count from previous period' })
  previousPeriodOrders: number;
}

export class OrderTopProductDto {
  @ApiProperty({ example: 123, description: 'Product ID' })
  productId: number;

  @ApiProperty({ example: 'Premium Leather Bag', description: 'Product name' })
  productName: string;

  @ApiProperty({ example: 450, description: 'Total quantity sold' })
  totalQuantity: number;

  @ApiProperty({ example: 4500000.00, description: 'Total revenue from this product (NGN)' })
  totalRevenue: number;

  @ApiProperty({ example: 89, description: 'Number of orders containing this product' })
  orderCount: number;
}

export class TimeMetricsDto {
  @ApiProperty({ example: 13.5, description: 'Average orders per day' })
  ordersPerDay: number;

  @ApiProperty({ example: 86666.67, description: 'Average revenue per day (NGN)' })
  revenuePerDay: number;

  @ApiProperty({ example: 14, description: 'Peak order hour (24-hour format)', required: false })
  peakOrderHour?: number;

  @ApiProperty({ example: 'Friday', description: 'Peak order day of week', required: false })
  peakOrderDay?: string;
}

export class OrderMetricsResponseDto {
  @ApiProperty({ example: 2500000.50, description: 'Total revenue (NGN)' })
  totalRevenue: number;

  @ApiProperty({ example: 400, description: 'Total number of orders' })
  totalOrders: number;

  @ApiProperty({ example: 6250.00, description: 'Average order value (NGN)' })
  averageOrderValue: number;

  @ApiProperty({ type: OrdersByStatusDto })
  ordersByStatus: OrdersByStatusDto;

  @ApiProperty({ type: PaymentMetricsDto })
  paymentMetrics: PaymentMetricsDto;

  @ApiProperty({ type: FinancialBreakdownDto })
  financialBreakdown: FinancialBreakdownDto;

  @ApiProperty({ type: SettlementMetricsDto })
  settlementMetrics: SettlementMetricsDto;

  @ApiProperty({ type: RefundMetricsDto })
  refundMetrics: RefundMetricsDto;

  @ApiProperty({ type: CustomerMetricsDto })
  customerMetrics: CustomerMetricsDto;

  @ApiProperty({ type: DeliveryMetricsDto })
  deliveryMetrics: DeliveryMetricsDto;

  @ApiProperty({ type: GrowthMetricsDto, required: false, description: 'Only included when date range is specified' })
  growthMetrics?: GrowthMetricsDto;

  @ApiProperty({ type: [OrderTopProductDto], required: false, description: 'Top 10 selling products' })
  topProducts?: OrderTopProductDto[];

  @ApiProperty({ type: TimeMetricsDto, required: false })
  timeMetrics?: TimeMetricsDto;
}

export class BusinessMetricsResponseDto extends OrderMetricsResponseDto {
  @ApiProperty({ example: 42, description: 'Business ID' })
  businessId: number;

  @ApiProperty({ example: 'Tech Store Lagos', description: 'Business name' })
  businessName: string;

  @ApiProperty({ example: 3.5, description: 'Conversion rate (percentage)', required: false })
  conversionRate?: number;
}

export class PlatformMetricsDto {
  @ApiProperty({ example: 156, description: 'Total number of businesses on platform' })
  totalBusinesses: number;

  @ApiProperty({ example: 124, description: 'Number of businesses with at least one paid order' })
  activeBusinesses: number;

  @ApiProperty({ example: 37500.00, description: 'Total platform fees collected (NGN)' })
  totalPlatformFees: number;

  @ApiProperty({ example: 93.75, description: 'Average platform fee per order (NGN)' })
  averagePlatformFeePerOrder: number;
}

export class TopBusinessDto {
  @ApiProperty({ example: 42, description: 'Business ID' })
  businessId: number;

  @ApiProperty({ example: 'Tech Store Lagos', description: 'Business name' })
  businessName: string;

  @ApiProperty({ example: 8500000.00, description: 'Total revenue (NGN)' })
  totalRevenue: number;

  @ApiProperty({ example: 320, description: 'Total number of orders' })
  totalOrders: number;

  @ApiProperty({ example: 26562.50, description: 'Average order value (NGN)' })
  averageOrderValue: number;
}

export class PaymentMethodDistributionDto {
  @ApiProperty({ example: 250, description: 'Number of card payments' })
  card: number;

  @ApiProperty({ example: 120, description: 'Number of bank transfer payments' })
  bankTransfer: number;

  @ApiProperty({ example: 45, description: 'Number of wallet payments' })
  wallet: number;

  @ApiProperty({ example: 15, description: 'Number of USSD payments' })
  ussd: number;

  @ApiProperty({ example: 30, description: 'Number of cash on delivery orders' })
  cashOnDelivery: number;
}

export class AdminMetricsResponseDto extends OrderMetricsResponseDto {
  @ApiProperty({ type: PlatformMetricsDto })
  platformMetrics: PlatformMetricsDto;

  @ApiProperty({ type: [TopBusinessDto], description: 'Top 10 performing businesses' })
  topBusinesses: TopBusinessDto[];

  @ApiProperty({ type: PaymentMethodDistributionDto })
  paymentMethodDistribution: PaymentMethodDistributionDto;
}

export class ErrorResponseDto {
  @ApiProperty({ example: 400, description: 'HTTP status code' })
  statusCode: number;

  @ApiProperty({ example: 'Bad Request', description: 'Error type' })
  error: string;

  @ApiProperty({ example: 'Invalid date range provided', description: 'Error message' })
  message: string;
}
