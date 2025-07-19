import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsOptional,
  IsNotEmpty,
  MinLength,
  MaxLength,
} from 'class-validator';

export class GenerateWalletDto {
  @ApiProperty({
    description: 'Wallet reference identifier',
    example: 'user_12345_wallet',
  })
  @IsString()
  @IsNotEmpty()
  walletReference: string;

  @ApiProperty({
    description: 'Wallet name/description',
    example: 'John Doe Personal Wallet',
  })
  @IsString()
  @IsNotEmpty()
  walletName: string;

  @ApiProperty({
    description: 'Currency code',
    example: 'NGN',
    default: 'NGN',
  })
  @IsString()
  @IsOptional()
  currencyCode?: string;

  @ApiProperty({
    description: 'Customer email',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  customerEmail: string;

  @ApiProperty({
    description: 'Customer BVN',
    example: '12345678901',
    minLength: 11,
    maxLength: 11,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(11)
  @MaxLength(11)
  bvn: string;
}

export class GenerateWalletResponseDto {
  @ApiProperty({
    description: 'Wallet generation success message',
    example: 'Wallet created successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Monnify wallet reference',
    example: 'WALLET_REF_123456789',
  })
  walletReference: string;

  @ApiProperty({
    description: 'Wallet account number',
    example: '1234567890',
  })
  accountNumber: string;

  @ApiProperty({
    description: 'Wallet account name',
    example: 'John Doe Personal Wallet',
  })
  accountName: string;

  @ApiProperty({
    description: 'Bank name associated with wallet',
    example: 'Moniepoint Microfinance Bank',
  })
  bankName: string;

  @ApiProperty({
    description: 'Bank code',
    example: '50515',
  })
  bankCode: string;

  @ApiProperty({
    description: 'Wallet currency',
    example: 'NGN',
  })
  currencyCode: string;

  @ApiProperty({
    description: 'Wallet creation date',
    example: '2023-01-15T10:30:00.000Z',
  })
  createdOn: string;
} 