import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsOptional,
  IsNumber,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

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
    example: 'device_123456',
  })
  @IsString()
  @IsNotEmpty()
  deviceid: string;

  @ApiProperty({
    description: 'Longitude coordinate',
    example: -122.4194,
  })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiProperty({
    description: 'Latitude coordinate',
    example: 37.7749,
  })
  @IsNumber()
  @IsOptional()
  latitude?: number;
}

export class RegisterUserResponseDto {
  @ApiProperty({
    description: 'Registration success message',
    example: 'User registered successfully',
  })
  message: string;

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
    description: 'Business location',
    example: '123 Main St, New York, NY 10001',
  })
  location: string;

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
    description: 'User ID',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  userId: number;

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
}

export class VerifyPhoneOtpDto {
  @ApiProperty({
    description: 'User ID',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  userId: number;

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
    example: 'device_123456',
  })
  @IsString()
  @IsNotEmpty()
  deviceid: string;

  @ApiProperty({
    description: 'Longitude coordinate',
    example: -122.4194,
  })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiProperty({
    description: 'Latitude coordinate',
    example: 37.7749,
  })
  @IsNumber()
  @IsOptional()
  latitude?: number;
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
}

export class VerifyKycDto {
  @ApiProperty({
    description: 'Reference ID of the verification from Dojah',
    example: 'DJ-31038041E0',
  })
  @IsString()
  @IsNotEmpty()
  reference_id: string;
}

export class KycVerificationResponseDto {
  @ApiProperty({
    description: 'Overall verification status',
    example: true,
  })
  status: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'BVN verification completed successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Reference ID of the verification',
    example: 'DJ-31038041E0',
  })
  reference_id: string;

  @ApiProperty({
    description: 'BVN verification status',
    example: true,
  })
  bvn_verified: boolean;
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
    description: '6-digit PIN for user authentication',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(6)
  @Matches(/^\d{6}$/, { message: 'PIN must be exactly 6 digits' })
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
    description: 'Forgot password success message',
    example: 'OTP sent successfully to your phone number',
  })
  message: string;

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
    description: 'OTP verification result message',
    example: 'OTP verified successfully. You can now reset your password.',
  })
  message: string;

  @ApiProperty({
    description: 'Verification status',
    example: true,
  })
  verified: boolean;

  @ApiProperty({
    description: 'Reset token for password change',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  resetToken?: string;
}


