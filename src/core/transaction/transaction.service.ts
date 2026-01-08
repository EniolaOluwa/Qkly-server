import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionStatus } from './entity/transaction.entity';
import { TransactionFilterDto } from './dto/transaction-filter.dto';
import { TransactionMetricsDto } from './dto/transaction-metric.dto';
import { PaginationResultDto } from '../../common/queries/dto';
import { PaginationMetadataDto } from '../../common/queries/dto/page-meta.dto';
import { ErrorHelper } from '../../common/utils';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) { }

  /**
   * Find all transactions with advanced filtering for Admin
   */
  async findAll(filterDto: TransactionFilterDto): Promise<PaginationResultDto<Transaction>> {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        status,
        type,
        userId,
        businessId,
        startDate,
        endDate,
        sort = 'createdAt',
        order = 'DESC'
      } = filterDto;

      const queryBuilder = this.transactionRepository.createQueryBuilder('transaction')
        .leftJoinAndSelect('transaction.user', 'user')
        .leftJoinAndSelect('user.profile', 'userProfile')
        .leftJoinAndSelect('transaction.business', 'business');

      // Search
      if (search) {
        queryBuilder.andWhere(
          '(transaction.reference ILIKE :search OR transaction.senderAccountName ILIKE :search OR transaction.recipientAccountName ILIKE :search OR user.email ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      // Filters
      if (status) {
        queryBuilder.andWhere('transaction.status = :status', { status });
      }

      if (type) {
        queryBuilder.andWhere('transaction.type = :type', { type });
      }

      if (userId) {
        queryBuilder.andWhere('transaction.userId = :userId', { userId });
      }

      if (businessId) {
        queryBuilder.andWhere('transaction.businessId = :businessId', { businessId });
      }

      if (startDate) {
        queryBuilder.andWhere('transaction.createdAt >= :startDate', { startDate });
      }

      if (endDate) {
        queryBuilder.andWhere('transaction.createdAt <= :endDate', { endDate });
      }

      // Sort
      queryBuilder.orderBy(`transaction.${sort}`, order);

      // Pagination
      queryBuilder.skip((page - 1) * limit).take(limit);

      const [entities, itemCount] = await queryBuilder.getManyAndCount();

      const meta = new PaginationMetadataDto({
        pageOptionsDto: { page, limit, order } as any,
        itemCount,
      });

      return { data: entities, meta };

    } catch (error) {
      this.logger.error(`Failed to fetch transactions: ${error.message}`, error.stack);
      ErrorHelper.InternalServerErrorException('Failed to fetch transactions');
    }
  }

  /**
   * Get detailed transaction metrics
   */
  async getMetrics(): Promise<TransactionMetricsDto> {
    try {
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      // Helper for calculating percentage change and trend
      const calculateTrend = (current: number, previous: number) => {
        if (previous === 0) return { percentageChange: current > 0 ? 100 : 0, trend: 'stable' as const }; // Handle div by 0
        const change = ((current - previous) / previous) * 100;
        return {
          percentageChange: parseFloat(change.toFixed(2)),
          trend: change > 0 ? 'increase' as const : change < 0 ? 'decrease' as const : 'stable' as const
        };
      };

      // Helper to fetch consolidated metrics for a period
      const getPeriodMetrics = async (start: Date, end?: Date) => {
        const query = this.transactionRepository.createQueryBuilder('transaction')
          .select('SUM(CASE WHEN transaction.status = :success THEN transaction.amount ELSE 0 END)', 'totalVolume')
          .addSelect('COUNT(transaction.id)', 'totalCount')
          .addSelect('COUNT(CASE WHEN transaction.status = :success THEN 1 END)', 'successCount')
          .where('transaction.createdAt >= :start', { start })
          .setParameters({ success: TransactionStatus.SUCCESS });

        if (end) {
          query.andWhere('transaction.createdAt <= :end', { end });
        }

        const result = await query.getRawOne();
        const totalVolume = parseFloat(result.totalVolume) || 0;
        const totalCount = parseInt(result.totalCount) || 0;
        const successCount = parseInt(result.successCount) || 0;

        return {
          totalVolume,
          totalCount,
          successCount,
          averageTransactionValue: successCount > 0 ? totalVolume / successCount : 0,
          successRate: totalCount > 0 ? (successCount / totalCount) * 100 : 0
        };
      };

      // 1. Get Metrics for Current Month and Previous Month
      const currentMetrics = await getPeriodMetrics(currentMonthStart);
      const previousMetrics = await getPeriodMetrics(previousMonthStart, previousMonthEnd);

      // 2. Breakdown by Type (All Time)
      const totalVolumeResult = await this.transactionRepository
        .createQueryBuilder('transaction')
        .select('SUM(transaction.amount)', 'total')
        .where('transaction.status = :status', { status: TransactionStatus.SUCCESS })
        .getRawOne();
      const allTimeTotalVolume = parseFloat(totalVolumeResult.total) || 0;

      const breakdownResult = await this.transactionRepository
        .createQueryBuilder('transaction')
        .select('transaction.type', 'type')
        .addSelect('COUNT(transaction.id)', 'count')
        .addSelect('SUM(transaction.amount)', 'volume')
        .groupBy('transaction.type')
        .getRawMany();

      const breakdownByType = breakdownResult.map(b => ({
        type: b.type,
        count: parseInt(b.count),
        volume: parseFloat(b.volume) || 0,
        percentage: allTimeTotalVolume > 0 ? ((parseFloat(b.volume) || 0) / allTimeTotalVolume) * 100 : 0
      }));

      // 3. Volume Over Time (Last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const volumeResult = await this.transactionRepository
        .createQueryBuilder('transaction')
        .select("TO_CHAR(transaction.createdAt, 'YYYY-MM-DD')", 'date')
        .addSelect('SUM(transaction.amount)', 'amount')
        .addSelect('COUNT(transaction.id)', 'count')
        .where('transaction.createdAt >= :date', { date: thirtyDaysAgo })
        .andWhere('transaction.status = :status', { status: TransactionStatus.SUCCESS })
        .groupBy('date')
        .orderBy('date', 'ASC')
        .getRawMany();

      const volumeOverTime = volumeResult.map(v => ({
        date: v.date,
        amount: parseFloat(v.amount) || 0,
        count: parseInt(v.count)
      }));

      // Construct Response
      return {
        totalVolume: {
          value: currentMetrics.totalVolume,
          ...calculateTrend(currentMetrics.totalVolume, previousMetrics.totalVolume)
        },
        totalTransactions: {
          value: currentMetrics.totalCount,
          ...calculateTrend(currentMetrics.totalCount, previousMetrics.totalCount)
        },
        averageTransactionValue: {
          value: parseFloat(currentMetrics.averageTransactionValue.toFixed(2)),
          ...calculateTrend(currentMetrics.averageTransactionValue, previousMetrics.averageTransactionValue)
        },
        successRate: {
          value: parseFloat(currentMetrics.successRate.toFixed(2)),
          ...calculateTrend(currentMetrics.successRate, previousMetrics.successRate)
        },
        breakdownByType,
        volumeOverTime
      };

    } catch (error) {
      this.logger.error(`Failed to get metrics: ${error.message}`, error.stack);
      ErrorHelper.InternalServerErrorException('Failed to get transaction metrics');
    }
  }

  async findOne(id: number): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id },
      relations: ['user', 'user.profile', 'business', 'order']
    });

    if (!transaction) {
      ErrorHelper.NotFoundException('Transaction not found');
    }

    return transaction;
  }
}
