import { IsString, IsNumber, IsOptional, IsNotEmpty, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitiateTransferDto {
  @ApiProperty({ example: 5000, description: 'Amount to transfer' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ example: '0023456789', description: 'Destination Account Number' })
  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @ApiProperty({ example: '058', description: 'Destination Bank Code' })
  @IsString()
  @IsNotEmpty()
  bankCode: string;

  @ApiProperty({ example: 'John Doe', description: 'Destination Account Name', required: false })
  @IsOptional()
  @IsString()
  accountName?: string;

  @ApiProperty({ example: 'Payment for services', description: 'Transfer narration' })
  @IsString()
  @IsNotEmpty()
  narration: string;
}

export class FinalizeTransferDto {
  @ApiProperty({ example: 'TRF_1234567890', description: 'Transfer Code from initiation response' })
  @IsString()
  @IsNotEmpty()
  transferCode: string;

  @ApiProperty({ example: '123456', description: 'OTP sent to merchant email' })
  @IsString()
  @IsNotEmpty()
  otp: string;
}
