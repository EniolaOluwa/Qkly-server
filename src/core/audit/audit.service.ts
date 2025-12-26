import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) { }

  async log(data: Partial<AuditLog>) {
    try {
      const log = this.auditLogRepository.create(data);
      return await this.auditLogRepository.save(log);
    } catch (error) {
      console.error('Failed to create audit log', error);
      // Fail silently to not impact main business logic
    }
  }

  async findAll(query: any) {
    const { page = 1, limit = 20, entityType, action, userId } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.auditLogRepository.createQueryBuilder('audit');

    if (entityType) {
      queryBuilder.andWhere('audit.entityType = :entityType', { entityType });
    }

    if (action) {
      queryBuilder.andWhere('audit.action = :action', { action });
    }

    if (userId) {
      queryBuilder.andWhere('audit.performedBy = :userId', { userId });
    }

    queryBuilder
      .orderBy('audit.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByUser(userId: number) {
    return this.auditLogRepository.find({
      where: { performedBy: userId },
      order: { createdAt: 'DESC' },
      take: 50, // Limit to recent 50 for user view
    });
  }
}
