import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';


export class WalletTransferRequestDto {
  @IsNumber()
  @Type(() => Number)
  amount: number;

  @IsString()
  reference: string;

  @IsString()
  narration: string;

  @IsString()
  destinationAccountNumber: string;

  @IsOptional()
  @IsString()
  destinationBankCode?: string;

  @IsOptional()
  @IsString()
  currency?: string = 'NGN';

  @IsOptional()
  @IsString()
  sourceAccountNumber?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  async?: boolean = false;
}


export class WalletTransferResponseDto {
  @IsIn(['SUCCESS', 'FAILED', 'PENDING'])
  status: 'SUCCESS' | 'FAILED' | 'PENDING';

  responseBody: any;
}




export class WalletTransferOtpDto {
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value.trim())
  reference: string;

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value.trim())
  otp: string;
}
