import { ErrorHelper } from './../utils/error.utils';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsOptional,
  IsNumber,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
  IsUUID,
  Length,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class WelcomeResponseDto {
  @ApiProperty({
    description: 'Welcome message from the application',
    example: 'Hello World! NestJS app with PostgreSQL is running.',
  })
  message: string;
}

export class HealthResponseDto {
  @ApiProperty({
    description: 'Health status of the application and database',
    example: 'Application is healthy! Database: PostgreSQL on localhost:6543',
  })
  status: string;
}

export class RegisterUserDto {
  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  @IsString()
  @IsNotEmpty()
  firstname: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  @IsString()
  @IsNotEmpty()
  lastname: string;

  @ApiProperty({
    description: 'User phone number',
    example: '+1234567890',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'securePassword123',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiProperty({
    description: 'Device ID',
    example: 'android_device_12345',
  })
  @IsString()
  @IsNotEmpty()
  deviceid: string;

  @ApiProperty({
    description: 'Longitude coordinate',
    example: -122.406417,
  })
  @IsNumber()
  longitude: number;

  @ApiProperty({
    description: 'Latitude coordinate',
    example: 37.7749,
  })
  @IsNumber()
  latitude: number;
}

export class RegisterUserResponseDto {
  @ApiProperty({
    description: 'Registration success message',
    example: 'User registered successfully',
  })
  message: string;

  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Token type',
    example: 'Bearer',
  })
  tokenType: string;

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 3600,
  })
  expiresIn: number;

  @ApiProperty({
    description: 'User ID',
    example: 1,
  })
  userId: number;

  @ApiProperty({
    description: 'User email',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  lastName: string;

  @ApiProperty({
    description: 'User phone number',
    example: '+2348123456789',
  })
  phone: string;

  @ApiProperty({
    description: 'Email verification status',
    example: false,
  })
  isEmailVerified: boolean;

  @ApiProperty({
    description: 'Phone verification status',
    example: false,
  })
  isPhoneVerified: boolean;

  @ApiProperty({
    description: 'Current onboarding step',
    example: 0,
  })
  onboardingStep: number;
}

export class CreateBusinessTypeDto {
  @ApiProperty({
    description: 'Business type name',
    example: 'Restaurant',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class UpdateBusinessTypeDto {
  @ApiProperty({
    description: 'Business type name',
    example: 'Restaurant',
  })
  @IsString()
  @IsOptional()
  name?: string;
}

export class BusinessTypeResponseDto {
  @ApiProperty({
    description: 'Business type ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Business type name',
    example: 'Restaurant',
  })
  name: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Update timestamp',
    example: '2023-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}

export class CreateBusinessDto {
  @ApiProperty({
    description: 'Business name',
    example: 'Acme Restaurant',
  })
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @ApiProperty({
    description: 'Business type ID',
    example: 1,
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      if (isNaN(parsed)) {
        ErrorHelper.BadRequestException('Business type ID must be a valid number');
      }
      return parsed;
    }
    return value;
  })
  @IsNumber()
  @IsNotEmpty()
  businessTypeId: number;

  @ApiProperty({
    description: 'Business description',
    example: 'A family-owned restaurant serving authentic cuisine',
    required: false,
  })
  @IsString()
  @IsOptional()
  businessDescription?: string;

  @ApiProperty({
    description: 'Business location',
    example: '123 Main St, New York, NY 10001',
  })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({
    description: 'Business logo image file (JPEG, PNG, GIF, WebP, BMP, TIFF supported)',
    type: 'string',
    format: 'binary',
    required: true,
  })
  @IsOptional()
  logo?: Express.Multer.File;

  @ApiPropertyOptional({
    description: 'Store name (if different from business name)',
    example: "Success's Clothings",
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  storeName?: string;

  @ApiPropertyOptional({
    description: 'Hero text for the store front',
    example: 'Welcome to our store!',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  heroText?: string;

  @ApiPropertyOptional({
    description: 'Store color in hex format',
    example: '#FF0000',
  })
  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Store color must be a valid hex color code (e.g., #FF0000)',
  })
  storeColor?: string;
}

export class UpdateBusinessDto {
  @ApiProperty({
    description: 'Business name',
    example: 'Acme Restaurant',
    required: false,
  })
  @IsString()
  @IsOptional()
  businessName?: string;

  @ApiProperty({
    description: 'Business type ID',
    example: 1,
    required: false,
  })
  @Transform(({ value }) => {
    if (value === undefined || value === null) return value;
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      if (isNaN(parsed)) {
        ErrorHelper.BadRequestException('Business type ID must be a valid number');
      }
      return parsed;
    }
    return value;
  })
  @IsNumber()
  @IsOptional()
  businessTypeId?: number;

  @ApiProperty({
    description: 'Business description',
    example: 'A family-owned restaurant serving authentic cuisine',
    required: false,
  })
  @IsString()
  @IsOptional()
  businessDescription?: string;

  @ApiProperty({
    description: 'Business location',
    example: '123 Main St, New York, NY 10001',
    required: false,
  })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({
    description: 'Business logo image file (JPEG, PNG, GIF, WebP, BMP, TIFF supported)',
    type: 'string',
    format: 'binary',
    required: false,
  })
  @IsOptional()
  @IsString()
  logo?: Express.Multer.File;

  @ApiPropertyOptional({
    description: 'Cover image file for store front (JPEG, PNG, GIF, WebP, BMP, TIFF supported)',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  coverImage?: Express.Multer.File;

  @ApiPropertyOptional({
    description: 'Store name (if different from business name)',
    example: "Success's Clothings",
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  storeName?: string;

  @ApiPropertyOptional({
    description: 'Hero text for the store front',
    example: 'Welcome to our store!',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  heroText?: string;

  @ApiPropertyOptional({
    description: 'Store color in hex format',
    example: '#FF0000',
  })
  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Store color must be a valid hex color code (e.g., #FF0000)',
  })
  storeColor?: string;
}

export class BusinessResponseDto {
  @ApiProperty({
    description: 'Business ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Business name',
    example: 'Acme Restaurant',
  })
  businessName: string;

  @ApiProperty({
    description: 'Business type information',
    type: BusinessTypeResponseDto,
  })
  businessType: BusinessTypeResponseDto;

  @ApiProperty({
    description: 'Business description',
    example: 'A family-owned restaurant serving authentic cuisine',
  })
  businessDescription: string;



  @ApiProperty({
    description: 'Store URL slug',
    example: 'fashion-hub',
  })
  slug: string | null;

  @ApiProperty({
    description: 'Business location',
    example: '123 Main St, New York, NY 10001',
  })
  location: string;

  @ApiProperty({
    description: 'Business logo URL from Cloudinary',
    example: 'https://res.cloudinary.com/your-cloud/image/upload/v1234567890/business-logos/logo.jpg',
    required: false,
  })
  logo?: string;

  @ApiPropertyOptional({
    description: 'Cover image URL for store front',
    example: 'https://res.cloudinary.com/your-cloud/image/upload/v1234567890/store-fronts/cover.jpg',
  })
  coverImage?: string;

  @ApiPropertyOptional({
    description: 'Store name (if different from business name)',
    example: "Success's Clothings",
  })
  storeName?: string;

  @ApiPropertyOptional({
    description: 'Hero text for the store front',
    example: 'Welcome to our store!',
  })
  heroText?: string;

  @ApiPropertyOptional({
    description: 'Store color in hex format',
    example: '#FF0000',
  })
  storeColor?: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Update timestamp',
    example: '2023-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}

export class GeneratePhoneOtpDto {
  @ApiProperty({
    description: 'Phone number for OTP verification',
    example: '+1234567890',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class GeneratePhoneOtpResponseDto {
  @ApiProperty({
    description: 'OTP generation success message',
    example: 'OTP sent successfully to your phone number',
  })
  message: string;

  @ApiProperty({
    description: 'OTP expiry time in minutes',
    example: 5,
  })
  expiryInMinutes: number;

  @ApiProperty({
    description: 'OTP expiry timestamp (ISO 8601 format)',
    example: '2024-01-20T10:35:00.000Z',
  })
  expiryTimestamp: Date;
}

export class VerifyPhoneOtpDto {
  @ApiProperty({
    description: 'Phone number for OTP verification',
    example: '+1234567890',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    description: 'OTP code to verify',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  otp: string;
}

export class VerifyPhoneOtpResponseDto {
  @ApiProperty({
    description: 'OTP verification result message',
    example: 'Phone number verified successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Verification status',
    example: true,
  })
  verified: boolean;
}

export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'securePassword123',
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    description: 'Device ID',
    example: 'ios_device_67890',
  })
  @IsString()
  @IsOptional()
  deviceid: string;

  @ApiProperty({
    description: 'Longitude coordinate',
    example: -122.406417,
  })
  @IsOptional()
  @IsNumber()
  longitude: number;

  @ApiProperty({
    description: 'Latitude coordinate',
    example: 37.7749,
  })
  @IsNumber()
  @IsOptional()
  latitude: number;
}

export class LoginResponseDto {
  @ApiProperty({
    description: 'Login success message',
    example: 'User logged in successfully',
  })
  message: string;

  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Token type',
    example: 'Bearer',
  })
  tokenType: string;

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 3600,
  })
  expiresIn: number;

  @ApiProperty({
    description: 'User ID',
    example: 1,
  })
  userId: number;

  @ApiProperty({
    description: 'User email',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  lastName: string;

  @ApiProperty({
    description: 'User phone number',
    example: '+1234567890',
  })
  phone: string;

  @ApiProperty({
    description: 'Email verification status',
    example: true,
  })
  isEmailVerified: boolean;

  @ApiProperty({
    description: 'Phone verification status',
    example: false,
  })
  isPhoneVerified: boolean;

  @ApiProperty({
    description: 'Current onboarding step (0: Personal Info, 1: Phone Verification, 2: Business Info, 3: KYC, 4: PIN)',
    example: 0,
  })
  onboardingStep: number;
}

export class VerifyKycDto {
  @ApiProperty({
    description: 'BVN (Bank Verification Number) for verification',
    example: '22222222222',
    minLength: 11,
    maxLength: 11,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(11)
  @MaxLength(11)
  @Matches(/^\d{11}$/, { message: 'BVN must be exactly 11 digits' })
  bvn: string;

  @ApiProperty({
    description: 'Selfie image file for BVN verification (JPEG, PNG supported)',
    type: 'string',
    format: 'binary',
    required: true,
  })
  @IsOptional()
  selfie_image?: Express.Multer.File;
}

export class KycVerificationResponseDto {
  @ApiProperty({
    description: 'Response message',
    example: 'BVN verification completed successfully',
  })
  message: string;

  @ApiProperty({
    description: 'First name from BVN records (only returned on successful verification)',
    example: 'JOHN',
    required: false,
  })
  first_name?: string;

  @ApiProperty({
    description: 'Middle name from BVN records (only returned on successful verification)',
    example: 'ANON',
    required: false,
  })
  middle_name?: string;

  @ApiProperty({
    description: 'Last name from BVN records (only returned on successful verification)',
    example: 'DOE',
    required: false,
  })
  last_name?: string;
}

export class KycErrorResponseDto {
  @ApiProperty({
    description: 'Error status',
    example: false,
  })
  status: boolean;

  @ApiProperty({
    description: 'Error message',
    example: 'Reference ID not found or verification failed',
  })
  message: string;

  @ApiProperty({
    description: 'Error code',
    example: 'VERIFICATION_NOT_FOUND',
  })
  error_code?: string;
}

export class CreatePinDto {
  @ApiProperty({
    description: '4-digit PIN for user authentication',
    example: '1234',
    minLength: 4,
    maxLength: 4,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(4)
  @Matches(/^\d{4}$/, { message: 'PIN must be exactly 4 digits' })
  pin: string;
}

export class CreatePinResponseDto {
  @ApiProperty({
    description: 'PIN creation success message',
    example: 'PIN created successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;
}

export class GenerateCreatePinOtpResponseDto {
  @ApiProperty({
    description: 'Masked phone number',
    example: '0813*****06',
  })
  maskedPhone: string;

  @ApiProperty({
    description: 'OTP expiration time in minutes',
    example: 5,
  })
  expiryInMinutes: number;
}

export class VerifyCreatePinOtpDto {
  @ApiProperty({
    description: '6-digit OTP code',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(6)
  @Matches(/^\d{6}$/, { message: 'OTP must be exactly 6 digits' })
  otp: string;
}

export class VerifyCreatePinOtpResponseDto {
  @ApiProperty({
    description: 'Verification status',
    example: true,
  })
  verified: boolean;

  @ApiProperty({
    description: 'PIN creation reference code',
    example: 'a1b2c3',
  })
  reference: string;
}

export class CreatePinWithReferenceDto {
  @ApiProperty({
    description: '4-digit PIN for user authentication',
    example: '1234',
    minLength: 4,
    maxLength: 4,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(4)
  @Matches(/^\d{4}$/, { message: 'PIN must be exactly 4 digits' })
  pin: string;

  @ApiProperty({
    description: 'PIN creation reference code from OTP verification',
    example: 'a1b2c3',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(6)
  @Matches(/^[a-f0-9]{6}$/, { message: 'Reference must be a 6-character hexadecimal string' })
  reference: string;
}

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ForgotPasswordResponseDto {
  @ApiProperty({
    description: 'Masked phone number',
    example: '0813*****06',
  })
  maskedPhone: string;

  @ApiProperty({
    description: 'OTP expiry time in minutes',
    example: 5,
  })
  expiryInMinutes: number;
}

export class VerifyPasswordResetOtpDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'OTP code received via SMS',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(6)
  @Matches(/^\d{6}$/, { message: 'OTP must be exactly 6 digits' })
  otp: string;
}

export class VerifyPasswordResetOtpResponseDto {
  @ApiProperty({
    description: 'Verification status',
    example: true,
  })
  verified: boolean;

  @ApiProperty({
    description: 'UUID reset token for password change',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  resetToken?: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    description: 'New password for the user account',
    example: 'newSecurePassword123!',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  newPassword: string;

  @ApiProperty({
    description: 'UUID reset token received from password reset OTP verification',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID(4, { message: 'Reset token must be a valid UUID' })
  resetToken: string;
}

export class ResetPasswordResponseDto {
  @ApiProperty({
    description: 'Password reset success message',
    example: 'Password reset successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Reset status',
    example: true,
  })
  success: boolean;
}

export class LoginWithPinDto {
  @ApiProperty({
    description: 'User phone number',
    example: '+1234567890',
  })
  @IsNotEmpty()
  @IsString()
  phone: string;


  @ApiProperty({
    description: '4-digit PIN for user authentication',
    example: '1234',
    minLength: 4,
    maxLength: 4,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(4)
  @Matches(/^\d{4}$/, { message: 'PIN must be exactly 4 digits' })
  pin: string;
}
