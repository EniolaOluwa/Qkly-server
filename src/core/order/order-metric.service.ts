import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, Repository } from "typeorm";
import { ErrorHelper } from "../../common/utils";
import { AdminMetricsDto, BusinessMetricsDto, DateRangeDto, OrderMetricsDto } from "./interfaces/order-metrics.interface";
import { Order } from "./entity/order.entity";
import { OrderStatus, PaymentStatus } from "./interfaces/order.interface";

@Injectable()
export class OrderMetricsService {
  private readonly logger = new Logger(OrderMetricsService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) { }

  /**
   * Get comprehensive metrics for a specific business
   */
  async getBusinessMetrics(
    businessId: number,
    dateRange?: DateRangeDto,
  ): Promise<BusinessMetricsDto> {
    try {
      const whereCondition: any = { businessId };

      if (dateRange?.startDate && dateRange?.endDate) {
        whereCondition.createdAt = Between(dateRange.startDate, dateRange.endDate);
      }

      const orders = await this.orderRepository.find({
        where: whereCondition,
        relations: ['items', 'business'],
      });

      if (orders.length === 0) {
        return this.getEmptyBusinessMetrics(businessId, orders[0]?.business?.businessName);
      }

      const baseMetrics = this.calculateBaseMetrics(orders);
      const topProducts = await this.getTopProducts(businessId, dateRange);

      let growthMetrics;
      if (dateRange?.startDate && dateRange?.endDate) {
        growthMetrics = await this.calculateGrowthMetrics(
          businessId,
          dateRange.startDate,
          dateRange.endDate,
        );
      }

      return {
        businessId,
        businessName: orders[0]?.business?.businessName || 'Unknown',
        ...baseMetrics,
        topProducts,
        growthMetrics,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get business metrics for business ${businessId}: ${error.message}`,
        error.stack,
      );
      ErrorHelper.InternalServerErrorException(
        `Failed to retrieve business metrics: ${error.message}`,
      );
    }
  }

  /**
   * Get comprehensive metrics for admin (platform-wide)
   */
  async getAdminMetrics(dateRange?: DateRangeDto): Promise<AdminMetricsDto> {
    try {
      const whereCondition: any = {};

      if (dateRange?.startDate && dateRange?.endDate) {
        whereCondition.createdAt = Between(dateRange.startDate, dateRange.endDate);
      }

      const orders = await this.orderRepository.find({
        where: whereCondition,
        relations: ['items', 'business'],
      });

      if (orders.length === 0) {
        return this.getEmptyAdminMetrics();
      }

      const baseMetrics = this.calculateBaseMetrics(orders);
      const platformMetrics = await this.calculatePlatformMetrics(orders, dateRange);
      const topBusinesses = await this.getTopBusinesses(dateRange);
      const paymentMethodDistribution = this.calculatePaymentMethodDistribution(orders);

      return {
        ...baseMetrics,
        platformMetrics,
        topBusinesses,
        paymentMethodDistribution,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get admin metrics: ${error.message}`,
        error.stack,
      );
      ErrorHelper.InternalServerErrorException(
        `Failed to retrieve admin metrics: ${error.message}`,
      );
    }
  }

  /**
   * Calculate base metrics common to both business and admin views
   */
  private calculateBaseMetrics(orders: Order[]): Omit<OrderMetricsDto, 'topProducts' | 'growthMetrics' | 'timeMetrics'> {
    const totalOrders = orders.length;

    // Revenue Metrics
    const paidOrders = orders.filter(o => o.paymentStatus === PaymentStatus.PAID);
    const totalRevenue = paidOrders.reduce((sum, order) => sum + Number(order.total), 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / paidOrders.length : 0;

    // Order Status Breakdown
    const ordersByStatus = {
      pending: orders.filter(o => o.status === OrderStatus.PENDING).length,
      confirmed: orders.filter(o => o.status === OrderStatus.CONFIRMED).length,
      processing: orders.filter(o => o.status === OrderStatus.PROCESSING).length,
      shipped: orders.filter(o => o.status === OrderStatus.SHIPPED).length,
      delivered: orders.filter(o => o.status === OrderStatus.DELIVERED).length,
      completed: orders.filter(o => o.status === OrderStatus.COMPLETED).length,
      cancelled: orders.filter(o => o.status === OrderStatus.CANCELLED).length,
      returned: orders.filter(o => o.status === OrderStatus.RETURNED).length,
      refunded: orders.filter(o => o.status === OrderStatus.REFUNDED).length,
    };

    // Payment Metrics
    const totalPaid = paidOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const totalPending = orders
      .filter(o => o.paymentStatus === PaymentStatus.PENDING)
      .reduce((sum, o) => sum + Number(o.total), 0);
    const totalFailed = orders
      .filter(o => o.paymentStatus === PaymentStatus.FAILED)
      .reduce((sum, o) => sum + Number(o.total), 0);
    const totalRefunded = orders
      .filter(o => o.paymentStatus === PaymentStatus.REFUNDED)
      .reduce((sum, o) => sum + Number(o.refundedAmount || 0), 0);
    const paymentSuccessRate = totalOrders > 0
      ? (paidOrders.length / totalOrders) * 100
      : 0;

    // Financial Breakdown
    const subtotal = paidOrders.reduce((sum, o) => sum + Number(o.subtotal), 0);
    const shippingFees = paidOrders.reduce((sum, o) => sum + Number(o.shippingFee), 0);
    const taxes = paidOrders.reduce((sum, o) => sum + Number(o.tax), 0);
    const discounts = paidOrders.reduce((sum, o) => sum + Number(o.discount), 0);
    const netRevenue = totalRevenue - totalRefunded;

    // Settlement Metrics
    const settledOrders = orders.filter(o => o.isBusinessSettled);
    const totalSettled = settledOrders.reduce(
      (sum, o) => sum + (Number(o.settlementDetails?.settlementAmount) || 0),
      0,
    );
    const pendingSettlement = paidOrders
      .filter(o => !o.isBusinessSettled)
      .reduce((sum, o) => sum + Number(o.total), 0);
    const settlementRate = paidOrders.length > 0
      ? (settledOrders.length / paidOrders.length) * 100
      : 0;
    const averageSettlementAmount = settledOrders.length > 0
      ? totalSettled / settledOrders.length
      : 0;

    // Refund Metrics
    const refundedOrders = orders.filter(o => o.isRefunded);
    const refundCount = refundedOrders.length;
    const refundRate = paidOrders.length > 0
      ? (refundCount / paidOrders.length) * 100
      : 0;
    const averageRefundAmount = refundCount > 0
      ? totalRefunded / refundCount
      : 0;

    // Customer Metrics
    const uniqueCustomerEmails = new Set(orders.map(o => o.customerEmail));
    const totalCustomers = uniqueCustomerEmails.size;
    const guestOrders = orders.filter(o => o.isGuestOrder).length;
    const registeredOrders = totalOrders - guestOrders;

    // For new vs returning customers, we'd need historical data
    // This is a simplified version
    const customerOrderCounts = new Map<string, number>();
    orders.forEach(order => {
      const count = customerOrderCounts.get(order.customerEmail) || 0;
      customerOrderCounts.set(order.customerEmail, count + 1);
    });
    const newCustomers = Array.from(customerOrderCounts.values()).filter(count => count === 1).length;
    const returningCustomers = totalCustomers - newCustomers;

    // Delivery Metrics
    const deliveryMetrics = {
      express: orders.filter(o => o.deliveryMethod === 'EXPRESS').length,
      standard: orders.filter(o => o.deliveryMethod === 'STANDARD').length,
      pickup: orders.filter(o => o.deliveryMethod === 'PICKUP').length,
    };

    return {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalOrders,
      averageOrderValue: Number(averageOrderValue.toFixed(2)),
      ordersByStatus,
      paymentMetrics: {
        totalPaid: Number(totalPaid.toFixed(2)),
        totalPending: Number(totalPending.toFixed(2)),
        totalFailed: Number(totalFailed.toFixed(2)),
        totalRefunded: Number(totalRefunded.toFixed(2)),
        paymentSuccessRate: Number(paymentSuccessRate.toFixed(2)),
      },
      financialBreakdown: {
        subtotal: Number(subtotal.toFixed(2)),
        shippingFees: Number(shippingFees.toFixed(2)),
        taxes: Number(taxes.toFixed(2)),
        discounts: Number(discounts.toFixed(2)),
        netRevenue: Number(netRevenue.toFixed(2)),
      },
      settlementMetrics: {
        totalSettled: Number(totalSettled.toFixed(2)),
        pendingSettlement: Number(pendingSettlement.toFixed(2)),
        settlementRate: Number(settlementRate.toFixed(2)),
        averageSettlementAmount: Number(averageSettlementAmount.toFixed(2)),
      },
      refundMetrics: {
        totalRefunded: Number(totalRefunded.toFixed(2)),
        refundCount,
        refundRate: Number(refundRate.toFixed(2)),
        averageRefundAmount: Number(averageRefundAmount.toFixed(2)),
      },
      customerMetrics: {
        totalCustomers,
        newCustomers,
        returningCustomers,
        guestOrders,
        registeredOrders,
      },
      deliveryMetrics,
    };
  }

  /**
   * Get top selling products for a business
   */
  private async getTopProducts(
    businessId: number,
    dateRange?: DateRangeDto,
    limit: number = 10,
  ): Promise<Array<{
    productId: number;
    productName: string;
    totalQuantity: number;
    totalRevenue: number;
    orderCount: number;
  }>> {
    try {
      const whereCondition: any = {
        businessId,
        paymentStatus: PaymentStatus.PAID,
      };

      if (dateRange?.startDate && dateRange?.endDate) {
        whereCondition.createdAt = Between(dateRange.startDate, dateRange.endDate);
      }

      const orders = await this.orderRepository.find({
        where: whereCondition,
        relations: ['items'],
      });

      const productStats = new Map<number, {
        productId: number;
        productName: string;
        totalQuantity: number;
        totalRevenue: number;
        orderCount: number;
      }>();

      orders.forEach(order => {
        order.items.forEach(item => {
          const existing = productStats.get(item.productId);
          if (existing) {
            existing.totalQuantity += item.quantity;
            existing.totalRevenue += Number(item.subtotal);
            existing.orderCount += 1;
          } else {
            productStats.set(item.productId, {
              productId: item.productId,
              productName: item.productName,
              totalQuantity: item.quantity,
              totalRevenue: Number(item.subtotal),
              orderCount: 1,
            });
          }
        });
      });

      return Array.from(productStats.values())
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, limit)
        .map(product => ({
          ...product,
          totalRevenue: Number(product.totalRevenue.toFixed(2)),
        }));
    } catch (error) {
      this.logger.error(`Failed to get top products: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Calculate growth metrics by comparing with previous period
   */
  private async calculateGrowthMetrics(
    businessId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    revenueGrowth: number;
    orderGrowth: number;
    previousPeriodRevenue: number;
    previousPeriodOrders: number;
  }> {
    try {
      const periodLength = endDate.getTime() - startDate.getTime();
      const previousStartDate = new Date(startDate.getTime() - periodLength);
      const previousEndDate = startDate;

      const previousOrders = await this.orderRepository.find({
        where: {
          businessId,
          paymentStatus: PaymentStatus.PAID,
          createdAt: Between(previousStartDate, previousEndDate),
        },
      });

      const currentOrders = await this.orderRepository.find({
        where: {
          businessId,
          paymentStatus: PaymentStatus.PAID,
          createdAt: Between(startDate, endDate),
        },
      });

      const previousRevenue = previousOrders.reduce((sum, o) => sum + Number(o.total), 0);
      const currentRevenue = currentOrders.reduce((sum, o) => sum + Number(o.total), 0);

      const revenueGrowth = previousRevenue > 0
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
        : 0;

      const orderGrowth = previousOrders.length > 0
        ? ((currentOrders.length - previousOrders.length) / previousOrders.length) * 100
        : 0;

      return {
        revenueGrowth: Number(revenueGrowth.toFixed(2)),
        orderGrowth: Number(orderGrowth.toFixed(2)),
        previousPeriodRevenue: Number(previousRevenue.toFixed(2)),
        previousPeriodOrders: previousOrders.length,
      };
    } catch (error) {
      this.logger.error(`Failed to calculate growth metrics: ${error.message}`, error.stack);
      return {
        revenueGrowth: 0,
        orderGrowth: 0,
        previousPeriodRevenue: 0,
        previousPeriodOrders: 0,
      };
    }
  }

  /**
   * Calculate platform-wide metrics for admin
   */
  private async calculatePlatformMetrics(
    orders: Order[],
    dateRange?: DateRangeDto,
  ): Promise<{
    totalBusinesses: number;
    activeBusinesses: number;
    totalPlatformFees: number;
    averagePlatformFeePerOrder: number;
  }> {
    try {
      const uniqueBusinesses = new Set(orders.map(o => o.businessId));
      const totalBusinesses = uniqueBusinesses.size;

      // Active businesses are those with at least one paid order
      const paidOrders = orders.filter(o => o.paymentStatus === PaymentStatus.PAID);
      const activeBusinessIds = new Set(paidOrders.map(o => o.businessId));
      const activeBusinesses = activeBusinessIds.size;

      // Calculate platform fees (assuming 1.5% platform fee from SETTLEMENT_PERCENTAGE)
      const totalPlatformFees = paidOrders.reduce((sum, order) => {
        const platformFee = Number(order.total) * 0.015; // 1.5%
        return sum + platformFee;
      }, 0);

      const averagePlatformFeePerOrder = paidOrders.length > 0
        ? totalPlatformFees / paidOrders.length
        : 0;

      return {
        totalBusinesses,
        activeBusinesses,
        totalPlatformFees: Number(totalPlatformFees.toFixed(2)),
        averagePlatformFeePerOrder: Number(averagePlatformFeePerOrder.toFixed(2)),
      };
    } catch (error) {
      this.logger.error(`Failed to calculate platform metrics: ${error.message}`, error.stack);
      return {
        totalBusinesses: 0,
        activeBusinesses: 0,
        totalPlatformFees: 0,
        averagePlatformFeePerOrder: 0,
      };
    }
  }

  /**
   * Get top performing businesses
   */
  private async getTopBusinesses(
    dateRange?: DateRangeDto,
    limit: number = 10,
  ): Promise<Array<{
    businessId: number;
    businessName: string;
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
  }>> {
    try {
      const whereCondition: any = { paymentStatus: PaymentStatus.PAID };

      if (dateRange?.startDate && dateRange?.endDate) {
        whereCondition.createdAt = Between(dateRange.startDate, dateRange.endDate);
      }

      const orders = await this.orderRepository.find({
        where: whereCondition,
        relations: ['business'],
      });

      const businessStats = new Map<number, {
        businessId: number;
        businessName: string;
        totalRevenue: number;
        totalOrders: number;
      }>();

      orders.forEach(order => {
        const existing = businessStats.get(order.businessId);
        if (existing) {
          existing.totalRevenue += Number(order.total);
          existing.totalOrders += 1;
        } else {
          businessStats.set(order.businessId, {
            businessId: order.businessId,
            businessName: order.business?.businessName || 'Unknown',
            totalRevenue: Number(order.total),
            totalOrders: 1,
          });
        }
      });

      return Array.from(businessStats.values())
        .map(business => ({
          ...business,
          averageOrderValue: business.totalOrders > 0
            ? business.totalRevenue / business.totalOrders
            : 0,
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, limit)
        .map(business => ({
          ...business,
          totalRevenue: Number(business.totalRevenue.toFixed(2)),
          averageOrderValue: Number(business.averageOrderValue.toFixed(2)),
        }));
    } catch (error) {
      this.logger.error(`Failed to get top businesses: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Calculate payment method distribution
   */
  private calculatePaymentMethodDistribution(orders: Order[]): {
    card: number;
    bankTransfer: number;
    wallet: number;
    ussd: number;
    cashOnDelivery: number;
  } {
    const paidOrders = orders.filter(o => o.paymentStatus === PaymentStatus.PAID);

    return {
      card: paidOrders.filter(o => o.paymentMethod === 'CARD').length,
      bankTransfer: paidOrders.filter(o => o.paymentMethod === 'BANK_TRANSFER').length,
      wallet: paidOrders.filter(o => o.paymentMethod === 'WALLET').length,
      ussd: paidOrders.filter(o => o.paymentMethod === 'USSD').length,
      cashOnDelivery: paidOrders.filter(o => o.paymentMethod === 'CASH_ON_DELIVERY').length,
    };
  }

  /**
   * Return empty metrics structure for business
   */
  private getEmptyBusinessMetrics(businessId: number, businessName?: string): BusinessMetricsDto {
    return {
      businessId,
      businessName: businessName || 'Unknown',
      totalRevenue: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      ordersByStatus: {
        pending: 0,
        confirmed: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
        completed: 0,
        cancelled: 0,
        returned: 0,
        refunded: 0,
      },
      paymentMetrics: {
        totalPaid: 0,
        totalPending: 0,
        totalFailed: 0,
        totalRefunded: 0,
        paymentSuccessRate: 0,
      },
      financialBreakdown: {
        subtotal: 0,
        shippingFees: 0,
        taxes: 0,
        discounts: 0,
        netRevenue: 0,
      },
      settlementMetrics: {
        totalSettled: 0,
        pendingSettlement: 0,
        settlementRate: 0,
        averageSettlementAmount: 0,
      },
      refundMetrics: {
        totalRefunded: 0,
        refundCount: 0,
        refundRate: 0,
        averageRefundAmount: 0,
      },
      customerMetrics: {
        totalCustomers: 0,
        newCustomers: 0,
        returningCustomers: 0,
        guestOrders: 0,
        registeredOrders: 0,
      },
      deliveryMetrics: {
        express: 0,
        standard: 0,
        pickup: 0,
      },
      topProducts: [],
    };
  }

  /**
   * Return empty metrics structure for admin
   */
  private getEmptyAdminMetrics(): AdminMetricsDto {
    return {
      totalRevenue: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      ordersByStatus: {
        pending: 0,
        confirmed: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
        completed: 0,
        cancelled: 0,
        returned: 0,
        refunded: 0,
      },
      paymentMetrics: {
        totalPaid: 0,
        totalPending: 0,
        totalFailed: 0,
        totalRefunded: 0,
        paymentSuccessRate: 0,
      },
      financialBreakdown: {
        subtotal: 0,
        shippingFees: 0,
        taxes: 0,
        discounts: 0,
        netRevenue: 0,
      },
      settlementMetrics: {
        totalSettled: 0,
        pendingSettlement: 0,
        settlementRate: 0,
        averageSettlementAmount: 0,
      },
      refundMetrics: {
        totalRefunded: 0,
        refundCount: 0,
        refundRate: 0,
        averageRefundAmount: 0,
      },
      customerMetrics: {
        totalCustomers: 0,
        newCustomers: 0,
        returningCustomers: 0,
        guestOrders: 0,
        registeredOrders: 0,
      },
      deliveryMetrics: {
        express: 0,
        standard: 0,
        pickup: 0,
      },
      platformMetrics: {
        totalBusinesses: 0,
        activeBusinesses: 0,
        totalPlatformFees: 0,
        averagePlatformFeePerOrder: 0,
      },
      topBusinesses: [],
      paymentMethodDistribution: {
        card: 0,
        bankTransfer: 0,
        wallet: 0,
        ussd: 0,
        cashOnDelivery: 0,
      },
    };
  }
}