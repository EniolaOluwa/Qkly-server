import { ApiProperty } from '@nestjs/swagger';

export class TrafficSourceDto {
  @ApiProperty({ example: 'instagram' })
  source: string;

  @ApiProperty({ example: 40, description: 'Percentage of traffic from this source' })
  percentage: number;

  @ApiProperty({ example: 400, description: 'Number of visits from this source' })
  visits: number;
}


export class InsightsKPIDto {
  @ApiProperty({ example: 1000, description: 'Total visits to store' })
  totalVisits: number;

  @ApiProperty({ example: 46, description: 'Number of items sold' })
  itemsSold: number;

  @ApiProperty({ example: 5000000, description: 'Total revenue in Naira' })
  revenue: number;
}


export class InsightsResponseDto {
  @ApiProperty({ type: InsightsKPIDto })
  kpis: InsightsKPIDto;

  @ApiProperty({ type: [TrafficSourceDto] })
  trafficSources: TrafficSourceDto[];

  @ApiProperty({ example: 'this_week' })
  period: string;

  @ApiProperty({ example: '2024-01-15T00:00:00Z' })
  startDate: Date;

  @ApiProperty({ example: '2024-01-21T23:59:59Z' })
  endDate: Date;
}

