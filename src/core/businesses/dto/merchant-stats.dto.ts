import { ApiProperty } from '@nestjs/swagger';

export class MerchantStatsDto {
  @ApiProperty({
    description: 'Business ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Business name',
    example: 'Fashion Hub Ltd',
  })
  businessName: string;

  @ApiProperty({
    description: 'Store name (public facing)',
    example: 'Fashion Hub',
    nullable: true,
  })
  storeName: string | null;

  @ApiProperty({
    description: 'Store URL slug',
    example: 'fashion-hub',
    nullable: true,
  })
  slug: string | null;

  @ApiProperty({
    description: 'Business owner email',
    example: 'owner@fashionhub.com',
  })
  ownerEmail: string;

  @ApiProperty({
    description: 'Business type name',
    example: 'E-commerce',
  })
  businessType: string;

  @ApiProperty({
    description: 'Business location',
    example: 'Lagos, Nigeria',
  })
  location: string;

  @ApiProperty({
    description: 'Total number of orders received',
    example: 156,
  })
  totalOrders: number;

  @ApiProperty({
    description: 'Total sales volume (sum of all order totals)',
    example: '2450000.00',
  })
  totalSalesVolume: string;

  @ApiProperty({
    description: 'Total number of products listed',
    example: 89,
  })
  totalProducts: number;

  @ApiProperty({
    description: 'Total number of transactions',
    example: 234,
  })
  totalTransactions: number;

  @ApiProperty({
    description: 'Whether Paystack subaccount is active',
    example: true,
  })
  isSubaccountActive: boolean;

  @ApiProperty({
    description: 'Revenue share percentage for the business',
    example: '95.00',
  })
  revenueSharePercentage: string;

  @ApiProperty({
    description: 'Date the business was registered',
    example: '2024-01-15T10:30:00.000Z',
  })
  dateRegistered: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-12-10T14:20:00.000Z',
  })
  lastUpdated: Date;
}