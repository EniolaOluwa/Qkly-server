import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { StoreVisit } from './entities/store-visit.entity';
import { Order } from '../order/entity/order.entity';
import { OrderStatus, PaymentStatus } from '../order/interfaces/order.interface';
import { OrderItem } from '../order/entity/order-items.entity';
import { Business } from '../businesses/business.entity';
import { InsightsQueryDto, TimePeriod } from './dto/insights-query.dto';
import { InsightsResponseDto, InsightsKPIDto, TrafficSourceDto } from './dto/insights-response.dto';
import { ErrorHelper } from '../../common/utils';


@Injectable()
export class InsightsService {
  constructor(
    @InjectRepository(StoreVisit)
    private readonly storeVisitRepository: Repository<StoreVisit>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
  ) { }

  async getInsights(
    userId: number,
    query: InsightsQueryDto,
  ): Promise<InsightsResponseDto> {
    // Get user's business
    const business = await this.businessRepository.findOne({
      where: { userId },
    });

    if (!business) {
      ErrorHelper.NotFoundException('Business not found for this user');
    }

    // Calculate date range based on period
    const { startDate, endDate } = this.calculateDateRange(query);

    // Get KPIs
    const kpis = await this.calculateKPIs(business.id, startDate, endDate);

    // Get traffic sources
    const trafficSources = await this.calculateTrafficSources(
      business.id,
      startDate,
      endDate,
    );

    return {
      kpis,
      trafficSources,
      period: query.period || TimePeriod.THIS_WEEK,
      startDate,
      endDate,
    };
  }

  async trackStoreVisit(
    businessId: number,
    trafficSource?: string,
    referrer?: string,
    utmSource?: string,
    utmMedium?: string,
    utmCampaign?: string,
    userAgent?: string,
    ipAddress?: string,
    sessionId?: string,
  ): Promise<StoreVisit> {
    // Normalize traffic source
    const normalizedSource = this.normalizeTrafficSource(
      trafficSource,
      referrer,
      utmSource,
    );

    const visit = this.storeVisitRepository.create({
      businessId,
      trafficSource: normalizedSource,
      referrer,
      utmSource,
      utmMedium,
      utmCampaign,
      userAgent,
      ipAddress,
      sessionId,
    });

    return await this.storeVisitRepository.save(visit);
  }

  private async calculateKPIs(
    businessId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<InsightsKPIDto> {
    // Total visits
    const totalVisits = await this.storeVisitRepository.count({
      where: {
        businessId,
        createdAt: Between(startDate, endDate),
      },
    });

    // Items sold - count order items from completed/confirmed orders
    const itemsSoldResult = await this.orderItemRepository
      .createQueryBuilder('orderItem')
      .innerJoin('orderItem.order', 'order')
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.createdAt >= :startDate', { startDate })
      .andWhere('order.createdAt <= :endDate', { endDate })
      .andWhere('order.status IN (:...statuses)', {
        statuses: [OrderStatus.CONFIRMED, OrderStatus.COMPLETED],
      })
      .andWhere('order.paymentStatus = :paymentStatus', {
        paymentStatus: PaymentStatus.PAID,
      })
      .select('SUM(orderItem.quantity)', 'total')
      .getRawOne();

    const itemsSold = parseInt(itemsSoldResult?.total || '0', 10);

    // Revenue - sum of total from paid orders
    const revenueResult = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.createdAt >= :startDate', { startDate })
      .andWhere('order.createdAt <= :endDate', { endDate })
      .andWhere('order.status IN (:...statuses)', {
        statuses: [OrderStatus.CONFIRMED, OrderStatus.COMPLETED],
      })
      .andWhere('order.paymentStatus = :paymentStatus', {
        paymentStatus: PaymentStatus.PAID,
      })
      .select('SUM(order.total)', 'total')
      .getRawOne();

    const revenue = parseFloat(revenueResult?.total || '0');

    return {
      totalVisits,
      itemsSold,
      revenue,
    };
  }

  private async calculateTrafficSources(
    businessId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<TrafficSourceDto[]> {
    // Get visit counts by traffic source
    const visitsBySource = await this.storeVisitRepository
      .createQueryBuilder('visit')
      .select('visit.trafficSource', 'source')
      .addSelect('COUNT(visit.id)', 'visits')
      .where('visit.businessId = :businessId', { businessId })
      .andWhere('visit.createdAt >= :startDate', { startDate })
      .andWhere('visit.createdAt <= :endDate', { endDate })
      .groupBy('visit.trafficSource')
      .getRawMany();

    // Calculate total visits
    const totalVisits = visitsBySource.reduce(
      (sum, item) => sum + parseInt(item.visits, 10),
      0,
    );

    // Calculate percentages and format
    const trafficSources: TrafficSourceDto[] = visitsBySource.map((item) => ({
      source: item.source || 'others',
      visits: parseInt(item.visits, 10),
      percentage: totalVisits > 0
        ? Math.round((parseInt(item.visits, 10) / totalVisits) * 100)
        : 0,
    }));

    // Sort by visits descending
    return trafficSources.sort((a, b) => b.visits - a.visits);
  }

  private calculateDateRange(query: InsightsQueryDto): {
    startDate: Date;
    endDate: Date;
  } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now);

    const period = query.period || TimePeriod.THIS_WEEK;

    switch (period) {
      case TimePeriod.TODAY:
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;

      case TimePeriod.THIS_WEEK:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
        startDate.setHours(0, 0, 0, 0);
        break;

      case TimePeriod.THIS_MONTH:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;

      case TimePeriod.LAST_MONTH:
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;

      case TimePeriod.THIS_YEAR:
        startDate = new Date(now.getFullYear(), 0, 1);
        break;

      case TimePeriod.CUSTOM:
        if (query.startDate && query.endDate) {
          startDate = new Date(query.startDate);
          endDate = new Date(query.endDate);
        } else {
          // Default to this week if custom dates not provided
          startDate = new Date(now);
          startDate.setDate(now.getDate() - now.getDay());
          startDate.setHours(0, 0, 0, 0);
        }
        break;

      default:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay());
        startDate.setHours(0, 0, 0, 0);
    }

    // Ensure endDate is end of day
    if (period !== TimePeriod.CUSTOM || !query.endDate) {
      endDate.setHours(23, 59, 59, 999);
    }

    return { startDate, endDate };
  }

  private normalizeTrafficSource(
    trafficSource?: string,
    referrer?: string,
    utmSource?: string,
  ): string {
    // If UTM source is provided, use it
    if (utmSource) {
      const normalized = utmSource.toLowerCase();
      if (['instagram', 'facebook', 'twitter', 'x', 'google', 'tiktok'].includes(normalized)) {
        return normalized === 'x' ? 'twitter' : normalized;
      }
      return 'others';
    }

    // If traffic source is provided, use it
    if (trafficSource) {
      const normalized = trafficSource.toLowerCase();
      if (['instagram', 'facebook', 'twitter', 'x', 'google', 'tiktok', 'direct', 'others'].includes(normalized)) {
        return normalized === 'x' ? 'twitter' : normalized;
      }
    }

    // Parse referrer
    if (referrer) {
      const url = new URL(referrer);
      const hostname = url.hostname.toLowerCase();

      if (hostname.includes('instagram.com')) return 'instagram';
      if (hostname.includes('facebook.com')) return 'facebook';
      if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'twitter';
      if (hostname.includes('google.com') || hostname.includes('google.')) return 'google';
      if (hostname.includes('tiktok.com')) return 'tiktok';
    }

    return 'others';
  }
}