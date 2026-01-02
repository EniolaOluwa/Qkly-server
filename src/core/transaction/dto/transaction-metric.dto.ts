import { ApiProperty } from '@nestjs/swagger';

export class MetricTrendDto {
  @ApiProperty()
  value: number;

  @ApiProperty()
  percentageChange: number;

  @ApiProperty({ enum: ['increase', 'decrease', 'stable'] })
  trend: 'increase' | 'decrease' | 'stable';
}

export class TransactionVolumeDto {
  @ApiProperty()
  date: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  count: number;
}

export class TransactionTypeBreakdownDto {
  @ApiProperty()
  type: string;

  @ApiProperty()
  count: number;

  @ApiProperty()
  volume: number;

  @ApiProperty()
  percentage: number;
}

export class TransactionMetricsDto {
  @ApiProperty({ type: MetricTrendDto })
  totalVolume: MetricTrendDto;

  @ApiProperty({ type: MetricTrendDto })
  totalTransactions: MetricTrendDto;

  @ApiProperty({ type: MetricTrendDto })
  averageTransactionValue: MetricTrendDto;

  @ApiProperty({ type: MetricTrendDto })
  successRate: MetricTrendDto;

  @ApiProperty({ type: [TransactionTypeBreakdownDto] })
  breakdownByType: TransactionTypeBreakdownDto[];

  @ApiProperty({ type: [TransactionVolumeDto] })
  volumeOverTime: TransactionVolumeDto[];
}
