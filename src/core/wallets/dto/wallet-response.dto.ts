import { Expose, Type } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';

export class WalletBalanceResponseDto {
  @IsString()
  @Expose()
  walletReference: string;

  @IsString()
  @Expose()
  accountNumber: string;

  @IsString()
  @Expose()
  accountName: string;

  @IsString()
  @Expose()
  bankName: string;

  @IsString()
  @Expose()
  bankCode: string;

  @IsNumber()
  @Type(() => Number)
  @Expose()
  availableBalance: number;

  @IsNumber()
  @Type(() => Number)
  @Expose()
  ledgerBalance: number;
}
