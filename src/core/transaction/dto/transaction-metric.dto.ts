import { ApiProperty } from '@nestjs/swagger';

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
  @ApiProperty()
  totalVolume: number;

  @ApiProperty()
  totalCount: number;

  @ApiProperty()
  successRate: number;

  @ApiProperty()
  averageTransactionValue: number;

  @ApiProperty({ type: [TransactionTypeBreakdownDto] })
  breakdownByType: TransactionTypeBreakdownDto[];

  @ApiProperty({ type: [TransactionVolumeDto] })
  volumeOverTime: TransactionVolumeDto[];
}
