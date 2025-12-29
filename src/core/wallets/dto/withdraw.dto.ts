import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class WithdrawalDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(100)
  @Type(() => Number)
  amount: number;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  bankAccountId: number;

  @IsNotEmpty()
  @IsString()
  pin: string;

  @IsOptional()
  @IsString()
  narration?: string;
}

export class WithdrawalResponseDto {
  success: boolean;
  message: string;
  reference: string;
}
