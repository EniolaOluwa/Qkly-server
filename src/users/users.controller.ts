import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  Get,
  Param,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { 
  RegisterUserDto, 
  RegisterUserResponseDto, 
  GeneratePhoneOtpDto, 
  GeneratePhoneOtpResponseDto, 
  VerifyPhoneOtpDto, 
  VerifyPhoneOtpResponseDto 
} from '../dto/responses.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Creates a new user account with the provided information. Password is hashed using SHA256.',
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: RegisterUserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - User with this email already exists',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async registerUser(
    @Body(ValidationPipe) registerUserDto: RegisterUserDto,
  ): Promise<RegisterUserResponseDto> {
    return this.usersService.registerUser(registerUserDto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Retrieves a user by their ID',
  })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getUserById(@Param('id') id: number) {
    const user = await this.usersService.findUserById(id);
    if (!user) {
      return { message: 'User not found' };
    }

    // Return user without password
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  @Post('generate-phone-otp')
  @ApiOperation({
    summary: 'Generate OTP for phone number verification',
    description: 'Generates a 6-digit OTP code for phone number verification. OTP expires in 5 minutes.',
  })
  @ApiResponse({
    status: 200,
    description: 'OTP generated successfully',
    type: GeneratePhoneOtpResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User with this ID and phone number not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async generatePhoneOtp(
    @Body(ValidationPipe) generatePhoneOtpDto: GeneratePhoneOtpDto,
  ): Promise<GeneratePhoneOtpResponseDto> {
    return this.usersService.generatePhoneOtp(generatePhoneOtpDto.userId, generatePhoneOtpDto.phone);
  }

  @Post('verify-phone-otp')
  @ApiOperation({
    summary: 'Verify OTP for phone number verification',
    description: 'Verifies the OTP code and marks the phone number as verified if successful.',
  })
  @ApiResponse({
    status: 200,
    description: 'OTP verified successfully',
    type: VerifyPhoneOtpResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid OTP or OTP expired',
  })
  @ApiResponse({
    status: 404,
    description: 'User with this ID and phone number not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async verifyPhoneOtp(
    @Body(ValidationPipe) verifyPhoneOtpDto: VerifyPhoneOtpDto,
  ): Promise<VerifyPhoneOtpResponseDto> {
    return this.usersService.verifyPhoneOtp(verifyPhoneOtpDto.userId, verifyPhoneOtpDto.phone, verifyPhoneOtpDto.otp);
  }
}
