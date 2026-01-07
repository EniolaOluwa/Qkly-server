import { HttpResponse } from '@app/common/utils/http-response.utils';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ValidationPipe
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags
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
  LoginWithPinDto,
  RegisterUserDto,
  RegisterUserResponseDto,
  ResetPasswordDto,
  ResetPasswordResponseDto,
  VerifyCreatePinOtpDto,
  VerifyCreatePinOtpResponseDto,
  UpgradeToTier3Dto,
  VerifyKycDto,
  VerifyPasswordResetOtpDto,
  VerifyPasswordResetOtpResponseDto,
  VerifyPhoneOtpDto,
  VerifyPhoneOtpResponseDto
} from '../../common/dto/responses.dto';
import { RoleGuard } from '../../common/guards/role.guard';
import { ErrorHelper } from '../../common/utils';
import { ChangePasswordDto, ChangePinDto, UpdateUserProfileDto, CreateTransactionPinDto, ChangeTransactionPinDto } from './dto/user.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { UsersService } from './users.service';


import { KycService } from './kyc.service';

@ApiTags('Users')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly kycService: KycService,
  ) { }

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
  ) {
    const register = this.usersService.registerUser(registerUserDto);
    return register
  }

  @Post('send-email-verification')
  @ApiOperation({ summary: 'Send email verification code' })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  async sendEmailVerification(
    @Request() req,
  ) {
    return this.usersService.sendEmailVerification(req.user.userId); // req.user.userId based on likely JwtStrategy payload
  }

  @Public()
  @Post('verify-email')
  @ApiOperation({ summary: 'Verify email with token' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
  ) {
    return this.usersService.verifyEmail(verifyEmailDto.token);
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
  ) {
    const login = await this.usersService.loginUser(loginDto);
    return HttpResponse.success({
      data: login,
      message: 'User logged in successfully'
    })
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user profile',
    description:
      'Retrieves the current user profile information using JWT token',
  })
  async getProfile(@Request() req) {
    const user = await this.usersService.findUserById(req.user.userId);
    return HttpResponse.success({
      data: { user },
      message: 'Profile retrieved successfully'
    });
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
    const data = await this.usersService.findUserById(id);
    return HttpResponse.success({
      message: "User retrieved successfully",
      data: data
    });
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
  ) {
    const data = await this.usersService.generatePhoneOtp(
      req.user.userId,
      generatePhoneOtpDto.phone,
    );

    return HttpResponse.success({
      message: 'OTP sent successfully to your phone number',
      data: data
    })
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
  ) {
    const data = await this.usersService.verifyPhoneOtp(
      req.user.userId,
      verifyPhoneOtpDto.phone,
      verifyPhoneOtpDto.otp,
    );

    return HttpResponse.success({
      message: 'Phone number verified successfully',
      data: data
    })
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
  ) {
    if (!selfieImage) {
      ErrorHelper.BadRequestException('Selfie image is required');
    }

    const data = await this.kycService.verifyBvnWithSelfie(
      req.user.userId,
      verifyKycDto.bvn,
      selfieImage,
    );

    return HttpResponse.success({
      message: 'BVN verification completed successfully',
      data: data
    })
  }

  @Post('upgrade-tier-3')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('idImage', {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only JPEG, PNG images and PDF documents are supported.'), false);
      }
    },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Upgrade to KYC Tier 3 (ID Verification)',
    description: 'Submit ID document for Tier 3 verification. Requires Tier 2 status. Manual review required.',
  })
  @ApiResponse({
    status: 200,
    description: 'ID document submitted successfully',
  })
  async upgradeTier3(
    @Body(ValidationPipe) dto: UpgradeToTier3Dto,
    @UploadedFile() idImage: Express.Multer.File,
    @Request() req,
  ) {
    if (!idImage) ErrorHelper.BadRequestException('ID Image is required');

    const data = await this.kycService.upgradeToTier3(
      req.user.userId,
      dto.idType,
      dto.idNumber,
      idImage,
    );

    return HttpResponse.success({
      message: 'ID Document submitted for review',
      data,
    });
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
  ) {
    const data = await this.usersService.createPinWithReference(req.user.userId, createPinDto.pin, createPinDto.reference);

    return HttpResponse.success({
      message: 'PIN created successfully',
      data: data
    })
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
  ) {
    const data = await this.usersService.generateCreatePinOtp(req.user.userId);

    return HttpResponse.success({
      message: 'OTP sent successfully to your phone number',
      data: data
    })
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
  ) {
    const data = await this.usersService.verifyCreatePinOtp(req.user.userId, verifyCreatePinOtpDto.otp);

    return HttpResponse.success({
      message: 'OTP verified successfully. You can now create your PIN.',
      data: data,
    })
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
  ) {
    const data = await this.usersService.forgotPassword(forgotPasswordDto.email);
    return HttpResponse.success({
      message: 'forget password request successful',
      data: data
    })
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
  ) {
    const data = await this.usersService.verifyPasswordResetOtp(
      verifyPasswordResetOtpDto.email,
      verifyPasswordResetOtpDto.otp,
    );

    return HttpResponse.success({
      message: 'Verify password reset otp successful',
      data: data
    })
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
  ) {
    const data = await this.usersService.resetPassword(
      resetPasswordDto.newPassword,
      resetPasswordDto.resetToken,
    );

    return HttpResponse.success({
      message: 'Password reset successfully',
      data: data
    })
  }
  // settings - change password
  @Patch('settings/change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Change user password',
    description: 'Allows an authenticated user to change their password by providing the current (old) password and a new password (with confirmation).',
  })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid current password or missing token' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async changePassword(
    @Body(ValidationPipe) changePasswordDto: ChangePasswordDto,
    @Request() req,
  ) {

    const userId = req.user?.userId;

    if (!userId) {
      ErrorHelper.BadRequestException('Authenticated user id not found');
    }

    if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
      ErrorHelper.BadRequestException('New password and confirm password do not match');
    }

    const data = await this.usersService.changePassword(
      changePasswordDto
    );

    return HttpResponse.success({
      data: data,
      message: 'Password changed successfully'
    })
  }



  // settings - update user profile
  @Patch('settings/profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update user profile',
    description: 'Allows an authenticated user to update their profile information (firstName, lastName, email, phone).',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Email or phone already in use',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async updateUserProfile(
    @Body(ValidationPipe) updateUserProfileDto: UpdateUserProfileDto,
    @Request() req,
  ) {
    const authUserId = req.user?.userId;
    if (!authUserId) {
      ErrorHelper.BadRequestException('Authenticated user id not found');
    }

    const data = await this.usersService.updateUserProfile(authUserId, updateUserProfileDto);

    return HttpResponse.success({
      data: data,
      message: 'User Profile updated successfully'
    })
  }

  // settings - change PIN
  @Patch('settings/change-pin')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Change user PIN',
    description: 'Allows an authenticated user to change their PIN by providing the current (old) PIN and a new PIN (with confirmation).',
  })
  @ApiResponse({
    status: 200,
    description: 'PIN changed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Validation error or PIN format invalid',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid current PIN or missing token',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async changePin(
    @Body(ValidationPipe) changePinDto: ChangePinDto,
    @Request() req,
  ) {
    const authUserId = req.user?.userId;
    if (!authUserId) {
      ErrorHelper.BadRequestException('Authenticated user id not found');
    }

    // Override userId from DTO with authenticated user ID for security
    changePinDto.userId = authUserId;

    const data = await this.usersService.changePin(changePinDto);

    return HttpResponse.success({
      data: data,
      message: 'Pin changed successfully'
    })
  }


  @Post('transaction-pin')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create transaction PIN',
    description: 'Allows an authenticated user to create a 4-digit transaction PIN for sensitive operations.',
  })
  @ApiResponse({
    status: 201,
    description: 'Transaction PIN created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - Validation error or PIN already set' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing token' })
  async createTransactionPin(
    @Body(ValidationPipe) createTransactionPinDto: CreateTransactionPinDto,
    @Request() req,
  ) {
    const authUserId = req.user?.userId;
    if (!authUserId) {
      ErrorHelper.BadRequestException('Authenticated user id not found');
    }

    createTransactionPinDto.userId = authUserId;
    const data = await this.usersService.createTransactionPin(createTransactionPinDto);

    return HttpResponse.success({
      data,
      message: 'Transaction PIN created successfully',
    });
  }

  @Patch('settings/transaction-pin')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Change transaction PIN',
    description: 'Allows an authenticated user to change their transaction PIN by providing the current (old) PIN and a new PIN.',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction PIN changed successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - Validation error or PIN format invalid' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid current PIN or missing token' })
  async changeTransactionPin(
    @Body(ValidationPipe) changeTransactionPinDto: ChangeTransactionPinDto,
    @Request() req,
  ) {
    const authUserId = req.user?.userId;
    if (!authUserId) {
      ErrorHelper.BadRequestException('Authenticated user id not found');
    }

    changeTransactionPinDto.userId = authUserId;
    const data = await this.usersService.changeTransactionPin(changeTransactionPinDto);

    return HttpResponse.success({
      data,
      message: 'Transaction PIN changed successfully',
    });
  }




  @Public()
  @Post('login-with-pin')
  @ApiOperation({
    summary: 'Login user with PIN',
    description:
      'Authenticates a user using their phone number and 4-digit PIN. Returns JWT and user profile.',
  })
  @ApiResponse({
    status: 200,
    description: 'User logged in successfully',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input or PIN not set',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid PIN or phone number',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async loginWithPin(
    @Body(ValidationPipe) loginWithPinDto: LoginWithPinDto,
    @Request() req,
  ) {
    const ip = req.ip || req.socket?.remoteAddress || 'Unknown IP';
    const userAgent = req.headers['user-agent'] || 'Unknown Device';

    const data = await this.usersService.loginWithPin(
      loginWithPinDto.phone,
      loginWithPinDto.pin,
      ip,
      userAgent
    );

    return HttpResponse.success({
      message: 'User logged in successfully',
      data: data,
    });
  }
}
