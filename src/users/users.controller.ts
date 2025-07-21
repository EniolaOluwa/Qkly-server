import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  Get,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import {
  RegisterUserDto,
  RegisterUserResponseDto,
  GeneratePhoneOtpDto,
  GeneratePhoneOtpResponseDto,
  VerifyPhoneOtpDto,
  VerifyPhoneOtpResponseDto,
  LoginDto,
  LoginResponseDto,
  VerifyKycDto,
  KycVerificationResponseDto,
  KycErrorResponseDto,
  CreatePinDto,
  CreatePinResponseDto,
  ForgotPasswordDto,
  ForgotPasswordResponseDto,
  VerifyPasswordResetOtpDto,
  VerifyPasswordResetOtpResponseDto,
  ResetPasswordDto,
  ResetPasswordResponseDto,
} from '../dto/responses.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

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

  @Post('login')
  @ApiOperation({
    summary: 'Login user',
    description:
      'Authenticates a user with email and password, and updates their device ID and location if provided.',
  })
  @ApiResponse({
    status: 200,
    description: 'User logged in successfully',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid email or password',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async loginUser(
    @Body(ValidationPipe) loginDto: LoginDto,
  ): Promise<LoginResponseDto> {
    return this.usersService.loginUser(loginDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user profile',
    description:
      'Retrieves the current user profile information using JWT token',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async getProfile(@Request() req) {
    return {
      message: 'Profile retrieved successfully',
      user: req.user,
    };
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
    description:
      'Generates a 6-digit OTP code for phone number verification. OTP expires in 5 minutes.',
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
    return this.usersService.generatePhoneOtp(
      generatePhoneOtpDto.userId,
      generatePhoneOtpDto.phone,
    );
  }

  @Post('verify-phone-otp')
  @ApiOperation({
    summary: 'Verify OTP for phone number verification',
    description:
      'Verifies the OTP code and marks the phone number as verified if successful.',
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
    return this.usersService.verifyPhoneOtp(
      verifyPhoneOtpDto.userId,
      verifyPhoneOtpDto.phone,
      verifyPhoneOtpDto.otp,
    );
  }

  @Post('verify-kyc')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verify user KYC status',
    description:
      'Retrieves BVN verification status from Dojah using reference ID. Requires JWT authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'BVN verification details retrieved successfully',
    type: KycVerificationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid reference ID format',
    type: KycErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: KycErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Verification reference ID not found',
    type: KycErrorResponseDto,
  })
  @ApiResponse({
    status: 500,
    description:
      'Internal server error - Failed to retrieve verification details',
    type: KycErrorResponseDto,
  })
  async verifyKyc(
    @Body(ValidationPipe) verifyKycDto: VerifyKycDto,
    @Request() req,
  ): Promise<KycVerificationResponseDto> {
    return this.usersService.getKycVerificationDetails(
      verifyKycDto.reference_id,
    );
  }

  @Post('create-pin')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create authentication PIN',
    description:
      'Creates a 6-digit encrypted PIN for user authentication. Requires JWT authentication.',
  })
  @ApiResponse({
    status: 201,
    description: 'PIN created successfully',
    type: CreatePinResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - PIN must be exactly 6 digits',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - User not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to create PIN',
  })
  async createPin(
    @Body(ValidationPipe) createPinDto: CreatePinDto,
    @Request() req,
  ): Promise<CreatePinResponseDto> {
    return this.usersService.createPin(req.user.id, createPinDto.pin);
  }

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Forgot password - Send OTP',
    description:
      "Sends an OTP to the user's registered phone number for password reset. Returns a masked phone number.",
  })
  @ApiResponse({
    status: 200,
    description: 'OTP sent successfully',
    type: ForgotPasswordResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - User has no phone number on file',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - User with this email not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to send OTP',
  })
  async forgotPassword(
    @Body(ValidationPipe) forgotPasswordDto: ForgotPasswordDto,
  ): Promise<ForgotPasswordResponseDto> {
    return this.usersService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('verify-password-reset-otp')
  @ApiOperation({
    summary: 'Verify password reset OTP',
    description:
      'Verifies the OTP code for password reset and returns a reset token.',
  })
  @ApiResponse({
    status: 200,
    description: 'OTP verified successfully',
    type: VerifyPasswordResetOtpResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid OTP or OTP expired',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async verifyPasswordResetOtp(
    @Body(ValidationPipe) verifyPasswordResetOtpDto: VerifyPasswordResetOtpDto,
  ): Promise<VerifyPasswordResetOtpResponseDto> {
    return this.usersService.verifyPasswordResetOtp(
      verifyPasswordResetOtpDto.email,
      verifyPasswordResetOtpDto.otp,
    );
  }

  @Post('reset-password')
  @ApiOperation({
    summary: 'Reset password with reset token',
    description:
      'Resets user password using the reset token obtained from OTP verification. The reset token is valid for 15 minutes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    type: ResetPasswordResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid password format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or expired reset token',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async resetPassword(
    @Body(ValidationPipe) resetPasswordDto: ResetPasswordDto,
  ): Promise<ResetPasswordResponseDto> {
    return this.usersService.resetPassword(
      resetPasswordDto.newPassword,
      resetPasswordDto.resetToken,
    );
  }
}
