import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestPayoutDto {
  @ApiProperty({ example: 5000, description: 'Amount to withdraw' })
  @IsNumber()
  @Min(100)
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ example: 1, description: 'Bank Account ID' })
  @IsNumber()
  @IsNotEmpty()
  bankAccountId: number;

  @ApiProperty({ example: 'Withdrawal for upkeep', required: false })
  @IsString()
  @IsOptional()
  narration?: string;
}
