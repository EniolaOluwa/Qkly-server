import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsNumber, IsNotEmpty, MinLength } from 'class-validator';

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