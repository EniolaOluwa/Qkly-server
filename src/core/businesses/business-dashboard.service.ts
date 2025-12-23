import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, MoreThanOrEqual, Repository } from 'typeorm';
import { DateTime } from 'luxon';
import { Business } from '../businesses/business.entity';
import { Order } from '../order/entity/order.entity';
import { OrderStatus, PaymentStatus } from '../order/interfaces/order.interface';
import { Product } from '../product/entity/product.entity';
import { TrafficEvent } from '../traffic-events/entity/traffic-events.entity';
import { Review } from '../review/entity/review.entity';
import { Transaction, TransactionStatus } from '../transaction/entity/transaction.entity';
import {
  CompleteDashboardDto,
  DashboardMetricsDto,
  DashboardQueryDto,
  LandingPageMetric,
  OrderStatusDistributionDto,
  PaymentMethodDistributionDto,
  RecentOrderDto,
  SalesChartDataDto,
  TopProductDto,
  TrafficSourceMetric,
} from './dto/dashboard-response.dto';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(TrafficEvent)
    private trafficRepository: Repository<TrafficEvent>,
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
  ) { }

  async getCompleteDashboard(
    businessId: number,
    userId: number,
    query?: DashboardQueryDto,
  ): Promise<CompleteDashboardDto> {
    await this.verifyBusinessOwnership(businessId, userId);

    const { startDate, endDate } = this.getDateRange(query);

    const [metrics, recentOrders, topProducts, salesChart, orderStatusDistribution, paymentMethodDistribution] =
      await Promise.all([
        this.getMetrics(businessId, startDate, endDate),
        this.getRecentOrders(businessId),
        this.getTopProducts(businessId, startDate, endDate),
        this.getSalesChartData(businessId, startDate, endDate),
        this.getOrderStatusDistribution(businessId, startDate, endDate),
        this.getPaymentMethodDistribution(businessId, startDate, endDate),
      ]);

    return {
      metrics,
      recentOrders,
      topProducts,
      salesChart,
      orderStatusDistribution,
      paymentMethodDistribution,
    };
  }

  async getMetrics(
    businessId: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<DashboardMetricsDto> {
    // Use default date range if not provided
    const dateRange = this.getDateRange({ startDate, endDate });
    const finalStartDate = startDate || dateRange.startDate;
    const finalEndDate = endDate || dateRange.endDate;

    // Get previous period for comparison
    const periodDuration = finalEndDate.getTime() - finalStartDate.getTime();
    const previousStartDate = new Date(finalStartDate.getTime() - periodDuration);
    const previousEndDate = new Date(finalStartDate.getTime());

    // Current period data
    const [
      orders,
      previousOrders,
      products,
      traffic,
      previousTraffic,
      uniqueCustomers,
      previousUniqueCustomers,
      ordersByStatus,
      revenueData,
      settlementData,
      trafficBySource,
      topLandingPages,
      timeBasedMetrics,
      reviewMetrics,
      walletBalance,
    ] = await Promise.all([
      this.getOrdersInPeriod(businessId, finalStartDate, finalEndDate),
      this.getOrdersInPeriod(businessId, previousStartDate, previousEndDate),
      this.getProductMetrics(businessId),
      this.getTrafficCount(businessId, finalStartDate, finalEndDate),
      this.getTrafficCount(businessId, previousStartDate, previousEndDate),
      this.getUniqueCustomers(businessId, finalStartDate, finalEndDate),
      this.getUniqueCustomers(businessId, previousStartDate, previousEndDate),
      this.getOrdersByStatus(businessId, finalStartDate, finalEndDate),
      this.getRevenueMetrics(businessId, finalStartDate, finalEndDate),
      this.getSettlementMetrics(businessId),
      this.getTrafficBySource(businessId, finalStartDate, finalEndDate),
      this.getTopLandingPages(businessId, finalStartDate, finalEndDate),
      this.getTimeBasedMetrics(businessId),
      this.getReviewMetrics(businessId, finalStartDate, finalEndDate),
      this.getWalletBalance(businessId),
    ]);

    // Calculate growth percentages
    const ordersGrowth = this.calculateGrowth(orders.length, previousOrders.length);
    const revenueGrowth = this.calculateGrowth(revenueData.total, revenueData.previousTotal);
    const customersGrowth = this.calculateGrowth(uniqueCustomers, previousUniqueCustomers);
    const trafficGrowth = this.calculateGrowth(traffic, previousTraffic);

    // Calculate conversion rate
    const conversionRate = traffic > 0 ? (orders.length / traffic) * 100 : 0;

    // Calculate average order value
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
    const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

    // Customer metrics
    const guestOrders = orders.filter(order => order.isGuestOrder).length;
    const returningCustomers = orders.filter(order => !order.isGuestOrder && order.userId).length - uniqueCustomers;
    const averageCustomerValue = uniqueCustomers > 0 ? totalRevenue / uniqueCustomers : 0;

    return {
      // Overview
      totalOrders: orders.length,
      totalProducts: products.total,
      totalRevenue: revenueData.total,
      totalCustomers: uniqueCustomers,
      totalTraffic: traffic,

      // Growth
      ordersGrowth,
      revenueGrowth,
      customersGrowth,
      trafficGrowth,

      // Orders
      pendingOrders: ordersByStatus.pending,
      processingOrders: ordersByStatus.processing,
      completedOrders: ordersByStatus.completed,
      cancelledOrders: ordersByStatus.cancelled,
      averageOrderValue,
      conversionRate,

      // Revenue
      totalPaid: revenueData.paid,
      totalPending: revenueData.pending,
      totalRefunded: revenueData.refunded,
      netRevenue: revenueData.paid - revenueData.refunded,
      expectedRevenue: revenueData.pending,

      // Products
      activeProducts: products.active,
      outOfStockProducts: products.outOfStock,
      lowStockProducts: products.lowStock,
      totalProductViews: traffic,

      // Customers
      newCustomers: uniqueCustomers,
      returningCustomers: Math.max(0, returningCustomers),
      guestOrders,
      averageCustomerValue,

      // Traffic
      trafficBySource,
      topLandingPages,

      // Settlement
      totalSettled: settlementData.settled,
      pendingSettlement: settlementData.pending,
      nextSettlementAmount: settlementData.nextAmount,

      // Time-based
      ordersToday: timeBasedMetrics.ordersToday,
      ordersThisWeek: timeBasedMetrics.ordersThisWeek,
      ordersThisMonth: timeBasedMetrics.ordersThisMonth,
      revenueToday: timeBasedMetrics.revenueToday,
      revenueThisWeek: timeBasedMetrics.revenueThisWeek,
      revenueThisMonth: timeBasedMetrics.revenueThisMonth,

      // Reviews
      totalReviews: reviewMetrics.totalReviews,
      averageRating: reviewMetrics.averageRating,

      // Wallet
      totalWalletBalance: walletBalance,
    };
  }

  async getRecentOrders(businessId: number, limit: number = 10): Promise<RecentOrderDto[]> {
    const orders = await this.orderRepository.find({
      where: { businessId },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return orders.map(order => ({
      id: order.id,
      orderReference: order.orderReference,
      customerName: order.customerName,
      total: Number(order.total),
      status: order.status,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
    }));
  }

  async getTopProducts(
    businessId: number,
    startDate?: Date,
    endDate?: Date,
    limit: number = 10,
  ): Promise<TopProductDto[]> {
    // Use default date range if not provided
    const dateRange = this.getDateRange({ startDate, endDate });
    const finalStartDate = startDate || dateRange.startDate;
    const finalEndDate = endDate || dateRange.endDate;
    const topProducts = await this.orderRepository
      .createQueryBuilder('order')
      .innerJoin('order.items', 'item')
      .innerJoin('item.product', 'product')
      .select('product.id', 'id')
      .addSelect('product.name', 'name')
      .addSelect('product.price', 'price')
      .addSelect('product.quantityInStock', 'quantityInStock')
      .addSelect('product.images', 'images')
      .addSelect('COUNT(DISTINCT order.id)', 'totalOrders')
      .addSelect('SUM(item.quantity * item.price)', 'revenue')
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.createdAt BETWEEN :startDate AND :endDate', { startDate: finalStartDate, endDate: finalEndDate })
      .groupBy('product.id')
      .addGroupBy('product.name')
      .addGroupBy('product.price')
      .addGroupBy('product.quantityInStock')
      .addGroupBy('product.images')
      .orderBy('revenue', 'DESC')
      .limit(limit)
      .getRawMany();

    return topProducts.map(p => ({
      id: Number(p.id),
      name: p.name,
      price: Number(p.price),
      quantityInStock: Number(p.quantityInStock),
      totalOrders: Number(p.totalOrders),
      revenue: Number(p.revenue),
      images: p.images ? p.images.split(',') : [],
    }));
  }

  async getSalesChartData(
    businessId: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<SalesChartDataDto[]> {
    // Use default date range if not provided
    const dateRange = this.getDateRange({ startDate, endDate });
    const finalStartDate = startDate || dateRange.startDate;
    const finalEndDate = endDate || dateRange.endDate;

    const orders = await this.orderRepository.find({
      where: {
        businessId,
        createdAt: Between(finalStartDate, finalEndDate),
      },
      order: { createdAt: 'ASC' },
    });

    // Group by date
    const salesByDate = new Map<string, { orders: number; revenue: number }>();

    orders.forEach(order => {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      const existing = salesByDate.get(dateKey) || { orders: 0, revenue: 0 };
      salesByDate.set(dateKey, {
        orders: existing.orders + 1,
        revenue: existing.revenue + Number(order.total),
      });
    });

    return Array.from(salesByDate.entries())
      .map(([date, data]) => ({
        date,
        orders: data.orders,
        revenue: data.revenue,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getOrderStatusDistribution(
    businessId: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<OrderStatusDistributionDto[]> {
    // Use default date range if not provided
    const dateRange = this.getDateRange({ startDate, endDate });
    const finalStartDate = startDate || dateRange.startDate;
    const finalEndDate = endDate || dateRange.endDate;

    const orders = await this.orderRepository.find({
      where: {
        businessId,
        createdAt: Between(finalStartDate, finalEndDate),
      },
    });

    const total = orders.length;
    const statusCounts = new Map<string, number>();

    orders.forEach(order => {
      statusCounts.set(order.status, (statusCounts.get(order.status) || 0) + 1);
    });

    return Array.from(statusCounts.entries()).map(([status, count]) => ({
      status,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }));
  }

  async getPaymentMethodDistribution(
    businessId: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<PaymentMethodDistributionDto[]> {
    // Use default date range if not provided
    const dateRange = this.getDateRange({ startDate, endDate });
    const finalStartDate = startDate || dateRange.startDate;
    const finalEndDate = endDate || dateRange.endDate;

    const orders = await this.orderRepository.find({
      where: {
        businessId,
        createdAt: Between(finalStartDate, finalEndDate),
      },
    });

    const total = orders.length;
    const methodData = new Map<string, { count: number; amount: number }>();

    orders.forEach(order => {
      const existing = methodData.get(order.paymentMethod) || { count: 0, amount: 0 };
      methodData.set(order.paymentMethod, {
        count: existing.count + 1,
        amount: existing.amount + Number(order.total),
      });
    });

    return Array.from(methodData.entries()).map(([method, data]) => ({
      method,
      count: data.count,
      amount: data.amount,
      percentage: total > 0 ? (data.count / total) * 100 : 0,
    }));
  }

  // Helper methods
  private async verifyBusinessOwnership(businessId: number, userId: number): Promise<void> {
    const business = await this.businessRepository.findOne({
      where: { id: businessId, userId },
    });

    if (!business) {
      throw new NotFoundException('Business not found or access denied');
    }
  }

  private getDateRange(query?: DashboardQueryDto): { startDate: Date; endDate: Date } {
    const now = DateTime.now();
    let startDate: Date;
    let endDate = now.toJSDate();

    if (query?.startDate && query?.endDate) {
      startDate = DateTime.fromISO(query.startDate.toString()).toJSDate();
      endDate = DateTime.fromISO(query.endDate.toString()).toJSDate();
    } else {
      switch (query?.period) {
        case 'today':
          startDate = now.startOf('day').toJSDate();
          break;
        case 'week':
          startDate = now.minus({ weeks: 1 }).toJSDate();
          break;
        case 'year':
          startDate = now.minus({ years: 1 }).toJSDate();
          break;
        case 'all':
          // From inception - using a date far in the past to capture all data
          startDate = DateTime.fromISO('2000-01-01').toJSDate();
          break;
        case 'month':
        default:
          startDate = now.minus({ months: 1 }).toJSDate();
      }
    }

    return { startDate, endDate };
  }

  private async getOrdersInPeriod(businessId: number, startDate: Date, endDate: Date): Promise<Order[]> {
    return this.orderRepository.find({
      where: {
        businessId,
        createdAt: Between(startDate, endDate),
      },
    });
  }

  private async getProductMetrics(businessId: number) {
    const [total, outOfStock, lowStock] = await Promise.all([
      this.productRepository.count({ where: { businessId } }),
      this.productRepository.count({ where: { businessId, quantityInStock: 0 } }),
      this.productRepository.count({
        where: {
          businessId,
          quantityInStock: Between(1, 10)
        }
      }),
    ]);

    return {
      total,
      active: total - outOfStock,
      outOfStock,
      lowStock,
    };
  }

  private async getTrafficCount(businessId: number, startDate: Date, endDate: Date): Promise<number> {
    return this.trafficRepository.count({
      where: {
        businessId,
        createdAt: Between(startDate, endDate),
      },
    });
  }

  private async getUniqueCustomers(businessId: number, startDate: Date, endDate: Date): Promise<number> {
    const result = await this.orderRepository
      .createQueryBuilder('order')
      .select('COUNT(DISTINCT order.customerEmail)', 'count')
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getRawOne();

    return Number(result?.count || 0);
  }

  private async getOrdersByStatus(businessId: number, startDate: Date, endDate: Date) {
    const orders = await this.orderRepository.find({
      where: {
        businessId,
        createdAt: Between(startDate, endDate),
      },
    });

    return {
      pending: orders.filter(o => o.status === OrderStatus.PENDING).length,
      processing: orders.filter(o => o.status === OrderStatus.PROCESSING).length,
      completed: orders.filter(o => o.status === OrderStatus.COMPLETED).length,
      cancelled: orders.filter(o => o.status === OrderStatus.CANCELLED).length,
    };
  }

  private async getRevenueMetrics(businessId: number, startDate: Date, endDate: Date) {
    const orders = await this.orderRepository.find({
      where: {
        businessId,
        createdAt: Between(startDate, endDate),
      },
    });

    // Previous period for comparison
    const periodDuration = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodDuration);

    const previousOrders = await this.orderRepository.find({
      where: {
        businessId,
        createdAt: Between(previousStartDate, startDate),
      },
    });

    return {
      total: orders.reduce((sum, o) => sum + Number(o.total), 0),
      paid: orders.filter(o => o.paymentStatus === PaymentStatus.PAID).reduce((sum, o) => sum + Number(o.total), 0),
      pending: orders.filter(o => o.paymentStatus === PaymentStatus.PENDING).reduce((sum, o) => sum + Number(o.total), 0),
      refunded: orders.filter(o => o.isRefunded).reduce((sum, o) => sum + Number(o.refundedAmount), 0),
      previousTotal: previousOrders.reduce((sum, o) => sum + Number(o.total), 0),
    };
  }

  private async getSettlementMetrics(businessId: number) {
    const [settled, pending] = await Promise.all([
      this.orderRepository
        .createQueryBuilder('order')
        .select('SUM(order.total)', 'total')
        .where('order.businessId = :businessId', { businessId })
        .andWhere('order.isBusinessSettled = :settled', { settled: true })
        .getRawOne(),
      this.orderRepository
        .createQueryBuilder('order')
        .select('SUM(order.total)', 'total')
        .where('order.businessId = :businessId', { businessId })
        .andWhere('order.isBusinessSettled = :settled', { settled: false })
        .andWhere('order.paymentStatus = :paid', { paid: PaymentStatus.PAID })
        .getRawOne(),
    ]);

    return {
      settled: Number(settled?.total || 0),
      pending: Number(pending?.total || 0),
      nextAmount: Number(pending?.total || 0),
    };
  }

  private async getTrafficBySource(
    businessId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<TrafficSourceMetric[]> {
    const traffic = await this.trafficRepository.find({
      where: {
        businessId,
        createdAt: Between(startDate, endDate),
      },
    });

    const total = traffic.length;
    const sourceCount = new Map<string, number>();

    traffic.forEach(t => {
      sourceCount.set(t.source, (sourceCount.get(t.source) || 0) + 1);
    });

    return Array.from(sourceCount.entries()).map(([source, count]) => ({
      source,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }));
  }

  private async getTopLandingPages(
    businessId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<LandingPageMetric[]> {
    const result = await this.trafficRepository
      .createQueryBuilder('traffic')
      .select('traffic.landingPage', 'page')
      .addSelect('COUNT(*)', 'visits')
      .where('traffic.businessId = :businessId', { businessId })
      .andWhere('traffic.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('traffic.landingPage IS NOT NULL')
      .groupBy('traffic.landingPage')
      .orderBy('visits', 'DESC')
      .limit(10)
      .getRawMany();

    return result.map(r => ({
      page: r.page,
      visits: Number(r.visits),
    }));
  }

  private async getTimeBasedMetrics(businessId: number) {
    const now = DateTime.now();
    const today = now.startOf('day').toJSDate();
    const weekAgo = now.minus({ weeks: 1 }).toJSDate();
    const monthAgo = now.minus({ months: 1 }).toJSDate();

    const [ordersToday, ordersWeek, ordersMonth] = await Promise.all([
      this.orderRepository.find({
        where: { businessId, createdAt: MoreThanOrEqual(today) },
      }),
      this.orderRepository.find({
        where: { businessId, createdAt: MoreThanOrEqual(weekAgo) },
      }),
      this.orderRepository.find({
        where: { businessId, createdAt: MoreThanOrEqual(monthAgo) },
      }),
    ]);

    return {
      ordersToday: ordersToday.length,
      ordersThisWeek: ordersWeek.length,
      ordersThisMonth: ordersMonth.length,
      revenueToday: ordersToday.reduce((sum, o) => sum + Number(o.total), 0),
      revenueThisWeek: ordersWeek.reduce((sum, o) => sum + Number(o.total), 0),
      revenueThisMonth: ordersMonth.reduce((sum, o) => sum + Number(o.total), 0),
    };
  }

  private calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  private async getReviewMetrics(businessId: number, startDate: Date, endDate: Date) {
    const reviews = await this.reviewRepository.find({
      where: {
        businessId,
        createdAt: Between(startDate, endDate),
        isVisible: true,
      },
    });

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? reviews.reduce((sum, review) => sum + review.ratings, 0) / totalReviews
      : 0;

    return {
      totalReviews,
      averageRating: Math.round(averageRating * 10) / 10,
    };
  }

  private async getWalletBalance(businessId: number): Promise<number> {
    const result = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('MAX(transaction.balanceAfter)', 'balance')
      .where('transaction.businessId = :businessId', { businessId })
      .andWhere('transaction.status = :status', { status: TransactionStatus.SUCCESS })
      .getRawOne();

    return Number(result?.balance || 0);
  }
}