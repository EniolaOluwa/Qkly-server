import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class AddBankAccountDto {
  @ApiProperty({ example: '0123456789', description: '10-digit account number' })
  @IsString()
  @Length(10, 10)
  @IsNotEmpty()
  accountNumber: string;

  @ApiProperty({ example: '058', description: 'Bank code' })
  @IsString()
  @IsNotEmpty()
  bankCode: string;

  @ApiProperty({ example: 'NGN', description: 'Currency code', required: false, default: 'NGN' })
  @IsString()
  @IsOptional()
  currency?: string;
}
