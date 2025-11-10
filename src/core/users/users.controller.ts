import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { UserRole } from '../../common/auth/user-role.enum';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CreatePinResponseDto,
  CreatePinWithReferenceDto,
  ForgotPasswordDto,
  ForgotPasswordResponseDto,
  GenerateCreatePinOtpResponseDto,
  GeneratePhoneOtpDto,
  GeneratePhoneOtpResponseDto,
  KycErrorResponseDto,
  KycVerificationResponseDto,
  LoginDto,
  LoginResponseDto,
  RegisterUserDto,
  RegisterUserResponseDto,
  ResetPasswordDto,
  ResetPasswordResponseDto,
  VerifyCreatePinOtpDto,
  VerifyCreatePinOtpResponseDto,
  VerifyKycDto,
  VerifyPasswordResetOtpDto,
  VerifyPasswordResetOtpResponseDto,
  VerifyPhoneOtpDto,
  VerifyPhoneOtpResponseDto
} from '../../common/dto/responses.dto';
import { RoleGuard } from '../../common/guards/role.guard';
import { UsersService } from './users.service';

@ApiTags('users')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Creates a new user account with the provided information. Password is hashed using SHA256. Returns a JWT token for immediate authentication.',
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
    description: 'Conflict - User with this email or phone number already exists',
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

  @Public()
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
  @ApiBearerAuth()
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Generate OTP for phone number verification',
    description:
      'Generates a 6-digit OTP code for phone number verification. OTP expires in 5 minutes. Requires JWT authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'OTP generated successfully',
    type: GeneratePhoneOtpResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
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
    @Request() req,
  ): Promise<GeneratePhoneOtpResponseDto> {
    return this.usersService.generatePhoneOtp(
      req.user.userId,
      generatePhoneOtpDto.phone,
    );
  }


  @Post('verify-phone-otp')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verify OTP for phone number verification',
    description:
      'Verifies the OTP code and marks the phone number as verified if successful. Requires JWT authentication.',
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
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
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
    @Request() req,
  ): Promise<VerifyPhoneOtpResponseDto> {
    return this.usersService.verifyPhoneOtp(
      req.user.userId,
      verifyPhoneOtpDto.phone,
      verifyPhoneOtpDto.otp,
    );
  }


  @Post('verify-kyc')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('selfie_image', {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only JPEG and PNG images are supported.'), false);
      }
    },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verify user BVN with selfie image',
    description:
      'Verifies user BVN using Dojah API with selfie image verification. Updates user onboarding step and BVN on successful verification. Requires JWT authentication. Accepts multipart/form-data with BVN and selfie image file.',
  })
  @ApiResponse({
    status: 200,
    description: 'BVN verification completed successfully',
    type: KycVerificationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid BVN format or selfie image',
    type: KycErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: KycErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - User not found',
    type: KycErrorResponseDto,
  })
  @ApiResponse({
    status: 500,
    description:
      'Internal server error - Failed to verify BVN',
    type: KycErrorResponseDto,
  })
  async verifyKyc(
    @Body(ValidationPipe) verifyKycDto: VerifyKycDto,
    @UploadedFile() selfieImage: Express.Multer.File,
    @Request() req,
  ): Promise<KycVerificationResponseDto> {
    if (!selfieImage) {
      throw new BadRequestException('Selfie image is required');
    }

    return this.usersService.verifyBvnWithSelfie(
      req.user.userId,
      verifyKycDto.bvn,
      selfieImage,
    );
  }


  @Post('create-pin')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create authentication PIN with reference',
    description:
      'Creates a 4-digit encrypted PIN for user authentication using a verified reference code. Requires JWT authentication and a valid reference from OTP verification.',
  })
  @ApiResponse({
    status: 201,
    description: 'PIN created successfully',
    type: CreatePinResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - PIN must be exactly 4 digits, invalid reference, or user already has a PIN',
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
    @Body(ValidationPipe) createPinDto: CreatePinWithReferenceDto,
    @Request() req,
  ): Promise<CreatePinResponseDto> {
    return this.usersService.createPinWithReference(req.user.userId, createPinDto.pin, createPinDto.reference);
  }

  @Post('generate-create-pin-otp')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Generate OTP for PIN creation',
    description:
      'Generates and sends an OTP to the user\'s phone number for PIN creation. Requires JWT authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'OTP sent successfully',
    type: GenerateCreatePinOtpResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - User has no phone number or already has a PIN',
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
    description: 'Internal server error - Failed to generate OTP',
  })
  async generateCreatePinOtp(
    @Request() req,
  ): Promise<GenerateCreatePinOtpResponseDto> {
    return this.usersService.generateCreatePinOtp(req.user.userId);
  }

  @Post('verify-create-pin-otp')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verify OTP for PIN creation',
    description:
      'Verifies the OTP for PIN creation and returns a reference UUID. Requires JWT authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'OTP verified successfully',
    type: VerifyCreatePinOtpResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid or expired OTP',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to verify OTP',
  })
  async verifyCreatePinOtp(
    @Body(ValidationPipe) verifyCreatePinOtpDto: VerifyCreatePinOtpDto,
    @Request() req,
  ): Promise<VerifyCreatePinOtpResponseDto> {
    return this.usersService.verifyCreatePinOtp(req.user.userId, verifyCreatePinOtpDto.otp);
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

  @Public()

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

  @Public()
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

  // Example admin-only endpoint demonstrating role-based access control
  @Get('admin/dashboard')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get admin dashboard data (Admin Only)',
    description: 'Retrieves dashboard data that only admin users can access',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin dashboard data retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  async getAdminDashboard(@Request() req: any): Promise<{ message: string; userRole: string }> {
    return {
      message: 'Welcome to the admin dashboard!',
      userRole: req.user.role,
    };
  }
}
