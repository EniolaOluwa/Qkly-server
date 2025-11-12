import { DateTime } from 'luxon';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsOptional,
  IsNotEmpty,
  MinLength,
  MaxLength,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
  IsIn,
  IsISO8601,
  IsNumber,
  IsPositive,
  IsUUID,
} from 'class-validator';
import { PaymentMethod } from '../../order/interfaces/order.interface';


@ValidatorConstraint({ name: 'isIsoDateFormat', async: false })
export class IsIsoDateFormatConstraint implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments) {
    if (!value) return false;

    const dt = DateTime.fromFormat(value, 'yyyy-MM-dd');
    return dt.isValid;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Date of birth must be in yyyy-MM-dd format (e.g. 1990-01-31)';
  }
}


export function IsIsoDateFormat() {
  return function (object: Object, propertyName: string) {
    Validate(IsIsoDateFormatConstraint)(object, propertyName);
  };
}




export class GenerateWalletDto {
  @ApiProperty({
    description: 'Unique wallet reference',
    example: 'TRX-d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6',
  })
  @IsOptional()
  walletReference?: string;

  @ApiProperty({
    description: 'Wallet name',
    example: 'John Doe Wallet',
  })
  @IsString()
  @IsNotEmpty()
  walletName: string;

  @ApiProperty({
    description: 'Customer email',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  customerEmail: string;

  @ApiProperty({
    description: 'Customer name (optional - will use user first and last name if not provided)',
    example: 'John Doe',
    required: false,
  })
  @IsString()
  @IsOptional()
  customerName?: string;

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

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'NGN',
    default: 'NGN',
  })
  @IsString()
  @IsOptional()
  currencyCode?: string;

  @ApiPropertyOptional({
    description: 'Date of birth in format YYYY-MM-DD',
    example: '1990-01-31',
  })
  @IsIsoDateFormat()
  dateOfBirth: string;
}

export class GenerateWalletResponseDto {
  @ApiProperty({
    description: 'Response message',
    example: 'Wallet created successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Operation success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Wallet reference',
    example: 'a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6',
  })
  walletReference: string;

  @ApiProperty({
    description: 'Account number',
    example: '1234567890',
  })
  accountNumber: string;

  @ApiProperty({
    description: 'Account name',
    example: 'John Doe Wallet',
  })
  accountName: string;

  @ApiProperty({
    description: 'Bank name',
    example: 'Monnify Bank',
  })
  bankName: string;

  @ApiProperty({
    description: 'Bank code',
    example: '100',
  })
  bankCode: string;

  @ApiProperty({
    description: 'Currency code',
    example: 'NGN',
  })
  currencyCode: string;

  @ApiProperty({
    description: 'Creation date',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdOn: string;
}

export class InitiatePaymentDto {
  @ApiProperty({
    description: 'Amount to pay',
    example: 1000.50,
  })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({
    description: 'Payment description',
    example: 'Payment for order #123',
  })
  @IsString()
  @IsNotEmpty()
  paymentDescription: string;

  @ApiPropertyOptional({
    description: 'Payment method (CARD, BANK_TRANSFER, USSD, WALLET)',
    example: 'CARD',
    enum: ['CARD', 'BANK_TRANSFER', 'USSD', 'WALLET', ''],
  })
  @IsString()
  @IsOptional()
  @IsIn(['CARD', 'BANK_TRANSFER', 'USSD', 'WALLET', ''])
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Payment reference',
    example: 'PAY-REF-123456789',
  })
  @IsString()
  @IsOptional()
  paymentReference?: string;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'NGN',
    default: 'NGN',
  })
  @IsString()
  @IsOptional()
  currencyCode?: string = 'NGN';

  @ApiPropertyOptional({
    description: 'Redirect URL after payment',
    example: 'https://example.com/payment-complete',
  })
  @IsString()
  @IsOptional()
  redirectUrl?: string;

  @IsOptional()
  metadata?: object
}

export class PaymentMethodDto {
  @ApiProperty({
    description: 'Payment method type',
    example: 'CARD',
    enum: ['CARD', 'BANK_TRANSFER', 'USSD', 'WALLET', ''],
  })
  @IsString()
  @IsIn(['CARD', 'BANK_TRANSFER', 'USSD', 'WALLET', ''])
  type: string;
}

export class PaymentResponseDto {
  @ApiProperty({
    description: 'Response message',
    example: 'Payment initialized successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Payment data',
  })
  data: any;
}
