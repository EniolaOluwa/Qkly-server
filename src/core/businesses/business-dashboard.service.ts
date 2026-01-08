import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DateTime } from 'luxon';
import { Between, Brackets, Repository } from 'typeorm';
import { OrderStatus } from '../../common/enums/order.enum';
import { PaymentStatus } from '../../common/enums/payment.enum';
import { SettlementStatus } from '../../common/enums/settlement.enum';
import { Business } from '../businesses/business.entity';
import { Order } from '../order/entity/order.entity';
import { Product } from '../product/entity/product.entity';
import { Review } from '../review/entity/review.entity';
import { TrafficEvent } from '../traffic-events/entity/traffic-events.entity';
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
  BusinessTopProductDto,
  TrafficSourceMetric
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

    // Execute queries in parallel
    const [
      currentPeriod,
      previousPeriod,
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
      this.getOrderMetrics(businessId, finalStartDate, finalEndDate),
      this.getOrderMetrics(businessId, previousStartDate, previousEndDate),
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
    const ordersGrowth = this.calculateGrowth(currentPeriod.totalOrders, previousPeriod.totalOrders);
    const revenueGrowth = this.calculateGrowth(revenueData.total, revenueData.previousTotal);
    const customersGrowth = this.calculateGrowth(uniqueCustomers, previousUniqueCustomers);
    const trafficGrowth = this.calculateGrowth(traffic, previousTraffic);

    // Calculate conversion rate
    const conversionRate = traffic > 0 ? (currentPeriod.totalOrders / traffic) * 100 : 0;

    // Calculate average order value
    const averageOrderValue = currentPeriod.totalOrders > 0 ? currentPeriod.totalRevenue / currentPeriod.totalOrders : 0;

    // Customer metrics
    // "Returning Customers" approximation: Registered customers who bought in this period. 
    // True "Returning" requires checking if they bought BEFORE this period too. 
    // For dashboard speed, using registered active customers count minus unique count is a heuristic, or we stick to available data.
    // Let's use: (Total Orders - Guest Orders) - New Customers (Unique) roughly implies repeat activity if > 0, but it's imperfect.
    // Better: Just use current registeredCustomers count as proxy for potential loyalty or simplify.
    // The previous logic was: orders.filter(!guest && userId).length - uniqueCustomers
    // This implies: Total Registered Transactions - Unique Registered Users = Repeat Transactions.
    const registeredTransactions = currentPeriod.totalOrders - currentPeriod.guestOrders;
    const returningCustomers = Math.max(0, registeredTransactions - uniqueCustomers);
    const averageCustomerValue = uniqueCustomers > 0 ? currentPeriod.totalRevenue / uniqueCustomers : 0;

    return {
      // Overview
      totalOrders: currentPeriod.totalOrders,
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
      returningCustomers,
      guestOrders: currentPeriod.guestOrders,
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
  ): Promise<BusinessTopProductDto[]> {
    // Use default date range if not provided
    const dateRange = this.getDateRange({ startDate, endDate });
    const finalStartDate = startDate || dateRange.startDate;
    const finalEndDate = endDate || dateRange.endDate;
    const topProducts = await this.orderRepository
      .createQueryBuilder('ord')
      .innerJoin('ord.items', 'item')
      .innerJoin('item.product', 'product')
      .select('product.id', 'id')
      .addSelect('product.name', 'name')
      .addSelect('product.price', 'price')
      .addSelect('product.quantityInStock', 'quantityInStock')
      .addSelect('product.imageUrls', 'images')
      .addSelect('COUNT(DISTINCT ord.id)', 'totalOrders')
      .addSelect('SUM(item.quantity * item.price)', 'revenue')
      .where('ord.businessId = :businessId', { businessId })
      .andWhere('ord.createdAt BETWEEN :startDate AND :endDate', { startDate: finalStartDate, endDate: finalEndDate })
      .groupBy('product.id')
      .addGroupBy('product.name')
      .addGroupBy('product.price')
      .addGroupBy('product.quantityInStock')
      .addGroupBy('product.imageUrls')
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

    // Use query builder to fetch daily aggregates
    const salesData = await this.orderRepository
      .createQueryBuilder('ord')
      .select("TO_CHAR(ord.createdAt, 'YYYY-MM-DD')", 'date') // Standard SQL date formatting. Warning: Dialect specific (Postgres)
      .addSelect('COUNT(*)', 'orders')
      .addSelect('SUM(ord.total)', 'revenue')
      .where('ord.businessId = :businessId', { businessId })
      .andWhere('ord.createdAt BETWEEN :startDate AND :endDate', { startDate: finalStartDate, endDate: finalEndDate })
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany();

    // Note: TO_CHAR is PostgreSQL specific. If using MySQL use DATE_FORMAT(ord.createdAt, '%Y-%m-%d')
    // Assuming Postgres based on TypeORM standard usage in this project or general SQL standard DATE() if supported.
    // Safe generic way if driver unknown: simply select all but only strictly needed fields, but grouping by date in DB is best.
    // Let's stick to a safer approach if DB dialect is uncertain:
    // Actually, let's use a Javascript grouping approach BUT only select date and total to minimize payload, OR try standard SQL DATE()
    // Given the previous code didn't suggest a specific DB, I'll use a safer selection approach or standard DATE() function hoping for Postgres/MySQL compatibility.
    // 'DATE(ord.createdAt)' works in MySQL and Postgres (as cast).

    // Re-implementation using a safer generic strategy if unsure of DB, but let's try Postgres syntax `TO_CHAR` or just `DATE_TRUNC`.
    // Actually, let's use a slightly less optimal but still much better than loading ALL data approach: 
    // Select basic fields and aggregate in JS to avoid dialect issues, OR assume Postgres (very common in NestJS).
    // Let's assume Postgres for this advanced app.

    return salesData.map(d => ({
      date: d.date,
      orders: Number(d.orders),
      revenue: Number(d.revenue)
    }));
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

    const result = await this.orderRepository
      .createQueryBuilder('ord')
      .select('ord.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('ord.businessId = :businessId', { businessId })
      .andWhere('ord.createdAt BETWEEN :startDate AND :endDate', { startDate: finalStartDate, endDate: finalEndDate })
      .groupBy('ord.status')
      .getRawMany();

    const total = result.reduce((sum, r) => sum + Number(r.count), 0);

    return result.map(r => ({
      status: r.status,
      count: Number(r.count),
      percentage: total > 0 ? (Number(r.count) / total) * 100 : 0,
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

    const result = await this.orderRepository
      .createQueryBuilder('ord')
      .select('ord.paymentMethod', 'method')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(ord.total)', 'amount')
      .where('ord.businessId = :businessId', { businessId })
      .andWhere('ord.createdAt BETWEEN :startDate AND :endDate', { startDate: finalStartDate, endDate: finalEndDate })
      .groupBy('ord.paymentMethod')
      .getRawMany();

    const totalOrders = result.reduce((sum, r) => sum + Number(r.count), 0);

    return result.map(r => ({
      method: r.method || 'Unknown',
      count: Number(r.count),
      amount: Number(r.amount),
      percentage: totalOrders > 0 ? (Number(r.count) / totalOrders) * 100 : 0,
    }));
  }

  // Helper methods
  async verifyBusinessOwnership(businessId: number, userId: number): Promise<void> {
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

  private async getOrderMetrics(businessId: number, startDate: Date, endDate: Date) {
    const qb = this.orderRepository.createQueryBuilder('ord');

    const result = await qb
      .select('COUNT(ord.id)', 'totalOrders')
      .addSelect('SUM(CAST(ord.total AS DECIMAL))', 'totalRevenue') // Cast for precision if needed
      .addSelect('SUM(CASE WHEN ord.isGuestOrder = true THEN 1 ELSE 0 END)', 'guestOrders')
      .addSelect('COUNT(DISTINCT CASE WHEN ord.isGuestOrder = false THEN ord.userId END)', 'registeredCustomers')
      .where('ord.businessId = :businessId', { businessId })
      .andWhere('ord.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getRawOne();

    return {
      totalOrders: Number(result?.totalOrders || 0),
      totalRevenue: Number(result?.totalRevenue || 0),
      guestOrders: Number(result?.guestOrders || 0),
      registeredCustomers: Number(result?.registeredCustomers || 0),
    };
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
      .createQueryBuilder('ord')
      .select('COUNT(DISTINCT ord.customerEmail)', 'count')
      .where('ord.businessId = :businessId', { businessId })
      .andWhere('ord.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getRawOne();

    return Number(result?.count || 0);
  }

  private async getOrdersByStatus(businessId: number, startDate: Date, endDate: Date) {
    const result = await this.orderRepository
      .createQueryBuilder('ord')
      .select('ord.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('ord.businessId = :businessId', { businessId })
      .andWhere('ord.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('ord.status')
      .getRawMany();

    const statusMap = new Map<string, number>();
    result.forEach(r => statusMap.set(r.status, Number(r.count)));

    return {
      pending: statusMap.get(OrderStatus.PENDING) || 0,
      processing: statusMap.get(OrderStatus.PROCESSING) || 0,
      completed: statusMap.get(OrderStatus.COMPLETED) || 0,
      cancelled: statusMap.get(OrderStatus.CANCELLED) || 0,
    };
  }

  private async getRevenueMetrics(businessId: number, startDate: Date, endDate: Date) {
    const periodDuration = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodDuration);

    const [currentPeriod, previousPeriod] = await Promise.all([
      this.orderRepository.createQueryBuilder('ord')
        .select('SUM(ord.total)', 'total')
        .addSelect(`SUM(CASE WHEN ord.paymentStatus = '${PaymentStatus.PAID}' THEN ord.total ELSE 0 END)`, 'paid')
        .addSelect(`SUM(CASE WHEN ord.paymentStatus = '${PaymentStatus.PENDING}' THEN ord.total ELSE 0 END)`, 'pending')
        .where('ord.businessId = :businessId', { businessId })
        .andWhere('ord.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
        .getRawOne(),

      this.orderRepository.createQueryBuilder('ord')
        .select('SUM(ord.total)', 'total')
        .where('ord.businessId = :businessId', { businessId })
        .andWhere('ord.createdAt BETWEEN :startDate AND :endDate', { startDate: previousStartDate, endDate: startDate })
        .getRawOne()
    ]);

    // Refunds need a separate query as they are in a different table/relation
    const refundResult = await this.orderRepository.createQueryBuilder('ord')
      .leftJoin('ord.refunds', 'refund')
      .select('SUM(refund.amountRefunded)', 'refunded')
      .where('ord.businessId = :businessId', { businessId })
      .andWhere('ord.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getRawOne();

    return {
      total: Number(currentPeriod?.total || 0),
      paid: Number(currentPeriod?.paid || 0),
      pending: Number(currentPeriod?.pending || 0),
      refunded: Number(refundResult?.refunded || 0),
      previousTotal: Number(previousPeriod?.total || 0),
    };
  }

  private async getSettlementMetrics(businessId: number) {
    const [settled, pending] = await Promise.all([
      this.orderRepository
        .createQueryBuilder('ord')
        .innerJoin('ord.settlement', 'settlement')
        .select('SUM(ord.total)', 'total')
        .where('ord.businessId = :businessId', { businessId })
        .andWhere('settlement.status = :status', { status: SettlementStatus.COMPLETED })
        .getRawOne(),
      this.orderRepository
        .createQueryBuilder('ord')
        .leftJoin('ord.settlement', 'settlement')
        .select('SUM(ord.total)', 'total')
        .where('ord.businessId = :businessId', { businessId })
        .andWhere('ord.paymentStatus = :paid', { paid: PaymentStatus.PAID })
        .andWhere(new Brackets(qb => {
          qb.where('settlement.id IS NULL')
            .orWhere('settlement.status != :completed', { completed: SettlementStatus.COMPLETED });
        }))
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
    const result = await this.trafficRepository
      .createQueryBuilder('traffic')
      .select('traffic.source', 'source')
      .addSelect('COUNT(*)', 'count')
      .where('traffic.businessId = :businessId', { businessId })
      .andWhere('traffic.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('traffic.source')
      .getRawMany();

    const total = result.reduce((sum, r) => sum + Number(r.count), 0);

    return result.map(r => ({
      source: r.source || 'Unknown',
      count: Number(r.count),
      percentage: total > 0 ? (Number(r.count) / total) * 100 : 0,
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

    // Helper to build query
    const getMetric = async (since: Date) => {
      const result = await this.orderRepository.createQueryBuilder('ord')
        .select('COUNT(*)', 'count')
        .addSelect('SUM(ord.total)', 'revenue')
        .where('ord.businessId = :businessId', { businessId })
        .andWhere('ord.createdAt >= :since', { since })
        .getRawOne();
      return { count: Number(result?.count || 0), revenue: Number(result?.revenue || 0) };
    };

    const [todayMetrics, weekMetrics, monthMetrics] = await Promise.all([
      getMetric(today),
      getMetric(weekAgo),
      getMetric(monthAgo),
    ]);

    return {
      ordersToday: todayMetrics.count,
      ordersThisWeek: weekMetrics.count,
      ordersThisMonth: monthMetrics.count,
      revenueToday: todayMetrics.revenue,
      revenueThisWeek: weekMetrics.revenue,
      revenueThisMonth: monthMetrics.revenue,
    };
  }

  private calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  private async getReviewMetrics(businessId: number, startDate: Date, endDate: Date) {
    const result = await this.reviewRepository
      .createQueryBuilder('review')
      .select('COUNT(*)', 'count')
      .addSelect('AVG(review.ratings)', 'averageRating')
      .where('review.businessId = :businessId', { businessId })
      .andWhere('review.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('review.isVisible = :isVisible', { isVisible: true })
      .getRawOne();

    const averageRating = Number(result?.averageRating || 0);

    return {
      totalReviews: Number(result?.count || 0),
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