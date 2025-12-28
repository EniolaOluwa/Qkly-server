import { ApiProperty } from '@nestjs/swagger';
import { MerchantStatsDto } from '../../businesses/dto/merchant-stats.dto';

export class MerchantDetailsResponseDto extends MerchantStatsDto {
  @ApiProperty({
    description: 'User ID of the business owner',
    example: 5,
  })
  userId: number;

  @ApiProperty({
    description: 'Phone number of the business owner',
    example: '+2348012345678',
    nullable: true,
  })
  phoneNumber: string | null;

  @ApiProperty({
    description: 'KYC Tier of the user',
    example: 'tier_2',
    nullable: true
  })
  kycTier: string | null;
}
