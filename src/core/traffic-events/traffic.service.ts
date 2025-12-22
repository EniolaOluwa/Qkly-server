import {
  BadRequestException,
  Injectable
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from '../businesses/business.entity';
import { detectSource } from './detect-source.util';
import { AdminTrafficFilterDto, RecordTrafficDto } from './dto/device.dto';
import { TrafficEvent } from './entity/traffic-events.entity';
import { TrafficSource } from './types/traffic-source.types';

@Injectable()
export class TrafficEventService {
  constructor(
    @InjectRepository(TrafficEvent)
    private readonly repo: Repository<TrafficEvent>,

    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
  ) { }

  async recordTraffic(
    businessId: number,
    req,
    body: RecordTrafficDto,
  ): Promise<TrafficEvent> {
    const business = await this.businessRepo.findOne({
      where: { id: businessId },
    });
    if (!business) throw new BadRequestException('Business not found');

    const referrerHeader = req.headers['referer'] as string | undefined;

    const source = detectSource(
      referrerHeader,
      body.referrerFromJs,
      body.utmSource,
    );

    const event = this.repo.create({
      businessId,
      source,
      referralUrl: referrerHeader ?? body.referrerFromJs,
      landingPage: body.landingPage,
      userAgent: req.headers['user-agent'],
      ipAddress:
        (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
        req.ip,
    });

    return await this.repo.save(event);
  }

  // ===== INSIGHTS =====
  async insightsBySource(businessId: number) {
    const raw = await this.repo
      .createQueryBuilder('e')
      .select('e.source', 'source')
      .addSelect('COUNT(*)', 'count')
      .where('e.businessId = :businessId', { businessId })
      .groupBy('e.source')
      .getRawMany<{ source: TrafficSource; count: string }>();

    // Convert DB result into a map
    const countMap = raw.reduce<Record<TrafficSource, number>>((acc, row) => {
      acc[row.source] = Number(row.count);
      return acc;
    }, {} as any);

    // Ensure ALL platforms exist
    return Object.values(TrafficSource).map((source) => ({
      source,
      count: countMap[source] ?? 0,
    }));
  }

  async insightsByDate(businessId: number) {
    return this.repo
      .createQueryBuilder('e')
      .select("DATE(e.createdAt)", "date")
      .addSelect('COUNT(*)', 'count')
      .where('e.businessId = :businessId', { businessId })
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany();
  }

  async insightsByLandingPage(businessId: number) {
    return this.repo
      .createQueryBuilder('e')
      .select('e.landingPage', 'landingPage')
      .addSelect('COUNT(*)', 'count')
      .where('e.businessId = :businessId', { businessId })
      .groupBy('e.landingPage')
      .orderBy('count', 'DESC')
      .getRawMany();
  }

  async fullInsights(businessId: number) {
    return {
      bySource: await this.insightsBySource(businessId),
      byDate: await this.insightsByDate(businessId),
      byLandingPage: await this.insightsByLandingPage(businessId),
    };
  }


  // ADMIN: Full filtering & pagination
  async adminQuery(filters: AdminTrafficFilterDto) {
    const qb = this.repo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.business', 'b')
      .select([
        'e.id',
        'e.source',
        'e.referralUrl',
        'e.landingPage',
        'e.ipAddress',
        'e.userAgent',
        'e.createdAt',
        'e.businessId',
        'b.id',
        'b.businessName',
      ]);

    if (filters.source) {
      qb.andWhere('e.source = :source', { source: filters.source });
    }

    if (filters.businessId) {
      qb.andWhere('e.businessId = :bid', { bid: filters.businessId });
    }

    if (filters.startDate) {
      qb.andWhere('e.createdAt >= :start', {
        start: new Date(filters.startDate)
      });
    }

    if (filters.endDate) {
      // Add 1 day to include the entire end date
      const endDate = new Date(filters.endDate);
      endDate.setDate(endDate.getDate() + 1);
      qb.andWhere('e.createdAt < :end', { end: endDate });
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    qb.skip((page - 1) * limit)
      .take(limit)
      .orderBy('e.createdAt', 'DESC');

    const [data, total] = await qb.getManyAndCount();

    // Transform the data to include businessName at the top level
    const transformedData = data.map(event => ({
      id: event.id,
      source: event.source,
      referralUrl: event.referralUrl,
      landingPage: event.landingPage,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      createdAt: event.createdAt,
      businessId: event.businessId,
      businessName: event.business?.businessName || null,
    }));

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: transformedData,
    };
  }
}
