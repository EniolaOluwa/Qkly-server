export interface DateRangeDto {
  startDate?: Date;
  endDate?: Date;
}

export interface OrderMetricsDto {
  // Revenue Metrics
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;

  // Order Status Breakdown
  ordersByStatus: {
    pending: number;
    confirmed: number;
    processing: number;
    shipped: number;
    delivered: number;
    completed: number;
    cancelled: number;
    returned: number;
    refunded: number;
  };

  // Payment Metrics
  paymentMetrics: {
    totalPaid: number;
    totalPending: number;
    totalFailed: number;
    totalRefunded: number;
    paymentSuccessRate: number;
  };

  // Financial Breakdown
  financialBreakdown: {
    subtotal: number;
    shippingFees: number;
    taxes: number;
    discounts: number;
    netRevenue: number;
  };

  // Settlement Metrics
  settlementMetrics: {
    totalSettled: number;
    pendingSettlement: number;
    settlementRate: number;
    averageSettlementAmount: number;
  };

  // Refund Metrics
  refundMetrics: {
    totalRefunded: number;
    refundCount: number;
    refundRate: number;
    averageRefundAmount: number;
  };

  // Growth Metrics
  growthMetrics?: {
    revenueGrowth: number;
    orderGrowth: number;
    previousPeriodRevenue: number;
    previousPeriodOrders: number;
  };

  // Top Products (if applicable)
  topProducts?: Array<{
    productId: number;
    productName: string;
    totalQuantity: number;
    totalRevenue: number;
    orderCount: number;
  }>;

  // Customer Metrics
  customerMetrics: {
    totalCustomers: number;
    newCustomers: number;
    returningCustomers: number;
    guestOrders: number;
    registeredOrders: number;
  };

  // Delivery Metrics
  deliveryMetrics: {
    express: number;
    standard: number;
    pickup: number;
    averageDeliveryTime?: number;
  };

  // Time-based Metrics
  timeMetrics?: {
    ordersPerDay: number;
    revenuePerDay: number;
    peakOrderHour?: number;
    peakOrderDay?: string;
  };
}

export interface BusinessMetricsDto extends OrderMetricsDto {
  businessId: number;
  businessName: string;
  conversionRate?: number;
}

export interface AdminMetricsDto extends OrderMetricsDto {
  // Platform-wide metrics
  platformMetrics: {
    totalBusinesses: number;
    activeBusinesses: number;
    totalPlatformFees: number;
    averagePlatformFeePerOrder: number;
  };

  // Top Performing Businesses
  topBusinesses: Array<{
    businessId: number;
    businessName: string;
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
  }>;

  // Payment Method Distribution
  paymentMethodDistribution: {
    card: number;
    bankTransfer: number;
    wallet: number;
    ussd: number;
    cashOnDelivery: number;
  };
}