import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, IsNumber, Matches, MinLength, MaxLength } from 'class-validator';


export class ChangePasswordDto {
  @ApiProperty({ example: 'oldPassword123' })
  @IsString()
  oldPassword: string;

  @ApiProperty({ example: 'newPassword123' })
  @IsString()
  @MinLength(8)
  newPassword: string;

  @ApiProperty({ example: 'newPassword123' })
  @IsString()
  confirmPassword: string;
}

export class UpdateUserProfileDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ example: 'john.doe@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class ChangePinDto {
  @ApiProperty({ example: '1234' })
  @IsString()
  @Matches(/^\d{4}$/, { message: 'Old PIN must be exactly 4 digits' })
  oldPin: string;

  @ApiProperty({ example: '5678' })
  @IsString()
  @Matches(/^\d{4}$/, { message: 'New PIN must be exactly 4 digits' })
  newPin: string;

  @ApiProperty({ example: '5678' })
  @IsString()
  @Matches(/^\d{4}$/, { message: 'Confirm PIN must be exactly 4 digits' })
  confirmPin: string;
}

export class CreateTransactionPinDto {
  @ApiProperty({ example: '1234' })
  @IsString()
  @Matches(/^\d{4}$/, { message: 'Transaction PIN must be exactly 4 digits' })
  pin: string;

  @ApiProperty({ example: '1234' })
  @IsString()
  @Matches(/^\d{4}$/, { message: 'Confirm Transaction PIN must be exactly 4 digits' })
  confirmPin: string;
}

export class ChangeTransactionPinDto {
  @ApiProperty({ example: '1234' })
  @IsString()
  @Matches(/^\d{4}$/, { message: 'Old PIN must be exactly 4 digits' })
  oldPin: string;

  @ApiProperty({ example: '5678' })
  @IsString()
  @Matches(/^\d{4}$/, { message: 'New PIN must be exactly 4 digits' })
  newPin: string;

  @ApiProperty({ example: '5678' })
  @IsString()
  @Matches(/^\d{4}$/, { message: 'Confirm PIN must be exactly 4 digits' })
  confirmPin: string;
}

export class ConfirmTransactionPinResetDto {
  @ApiProperty({ example: '123456', description: 'OTP received via SMS/Email' })
  @IsString()
  otp: string;

  @ApiProperty({ example: '1234', description: 'New 4-digit Transaction PIN' })
  @IsString()
  @Matches(/^\d{4}$/, { message: 'New PIN must be exactly 4 digits' })
  newPin: string;

  @ApiProperty({ example: '1234', description: 'Confirm new Transaction PIN' })
  @IsString()
  @Matches(/^\d{4}$/, { message: 'Confirm PIN must be exactly 4 digits' })
  confirmPin: string;
}