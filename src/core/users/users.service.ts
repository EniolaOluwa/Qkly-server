import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import {
  CreatePinResponseDto,
  KycVerificationResponseDto,
  LoginDto,
  LoginResponseDto,
  RegisterUserDto,
  RegisterUserResponseDto
} from '../../common/dto/responses.dto';
import { CryptoUtil } from '../../common/utils/crypto.util';
import { ErrorHelper } from './../../common/utils/error.utils';
import { OnboardingStep } from './dto/onboarding-step.enum';
import { ChangePasswordDto, ChangePinDto, UpdateUserProfileDto } from './dto/user.dto';
import { Otp, OtpPurpose, OtpType } from './entity/otp.entity';
import { User } from './entity/user.entity';




const EXPIRATION_TIME_SECONDS = 3600; // 1 hour

@Injectable()
export class UsersService {

  private readonly logger = new Logger(UsersService.name);
  private readonly MAX_PIN_ATTEMPTS = 5;
  private readonly PIN_LOCK_MINUTES = 15;


  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Otp)
    private otpRepository: Repository<Otp>,
    private jwtService: JwtService,
    private httpService: HttpService,
    private configService: ConfigService,
  ) { }


  async registerUser(
    registerUserDto: RegisterUserDto,
  ): Promise<RegisterUserResponseDto> {
    try {
      // Check if user with email already exists
      const existingUserByEmail = await this.userRepository.findOne({
        where: { email: registerUserDto.email },
      });

      if (existingUserByEmail) {
        ErrorHelper.ConflictException('User with this email already exists');
      }

      // Check if user with phone already exists
      const existingUserByPhone = await this.userRepository.findOne({
        where: { phone: registerUserDto.phone },
      });

      if (existingUserByPhone) {
        ErrorHelper.ConflictException('User with this phone number already exists');
      }

      // Hash the password
      const hashedPassword = CryptoUtil.hashPassword(registerUserDto.password);

      // Create new user
      const user = this.userRepository.create({
        firstName: registerUserDto.firstname,
        lastName: registerUserDto.lastname,
        phone: registerUserDto.phone,
        email: registerUserDto.email,
        password: hashedPassword,
        deviceId: registerUserDto.deviceid,
        longitude: registerUserDto.longitude,
        latitude: registerUserDto.latitude,
      });

      // Save user to database
      const savedUser = await this.userRepository.save(user);

      // Generate JWT payload
      const payload = {
        sub: savedUser.id,
        email: savedUser.email,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        deviceId: registerUserDto.deviceid,
        role: savedUser.role,
      };


      // Generate JWT token
      const accessToken = this.jwtService.sign(payload);

      /**
       * TODO: Send Email to user
      */

      // Return user information with token
      return {
        message: 'User registered successfully',
        accessToken,
        tokenType: 'Bearer',
        expiresIn: EXPIRATION_TIME_SECONDS,
        userId: savedUser.id,
        email: savedUser.email,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        phone: savedUser.phone,
        isEmailVerified: savedUser.isEmailVerified,
        isPhoneVerified: savedUser.isPhoneVerified,
        onboardingStep: savedUser.onboardingStep,
      };
    } catch (error) {

      if (error instanceof ConflictException) {
        throw error;
      }
      ErrorHelper.InternalServerErrorException('Failed to register user');
    }
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findUserById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async loginUser(loginDto: LoginDto): Promise<LoginResponseDto> {

    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });


    if (!user) {
      ErrorHelper.UnauthorizedException('Invalid email or password');
    }

    // Verify password
    if (!CryptoUtil.verifyPassword(loginDto.password, user.password)) {
      ErrorHelper.UnauthorizedException('Invalid email or password');
    }

    // Update user's device ID and location if provided
    const updateData: Partial<User> = {};
    if (loginDto.deviceid) {
      updateData.deviceId = loginDto.deviceid;
    }
    if (loginDto.longitude !== undefined) {
      updateData.longitude = loginDto.longitude;
    }
    if (loginDto.latitude !== undefined) {
      updateData.latitude = loginDto.latitude;
    }

    // Update user if there's data to update
    if (Object.keys(updateData).length > 0) {
      await this.userRepository.update(user.id, updateData);
    }

    // Generate JWT payload
    const payload = {
      sub: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      deviceId: loginDto.deviceid,
      role: user.role,
    };

    // Generate JWT token
    const accessToken = this.jwtService.sign(payload);

    // Return user information with token
    return {
      message: 'User logged in successfully',
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 3600, // 1 hour in seconds
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      onboardingStep: user.onboardingStep,
    };
  }

  // Termii sms otp
  async generatePhoneOtp(
    userId: number,
    phone: string,
  ): Promise<{ message: string; expiryInMinutes: number; expiryTimestamp: Date }> {
    const user = await this.userRepository.findOne({
      where: { id: userId, phone },
    });

    if (!user) {
      ErrorHelper.NotFoundException(
        'User with this ID and phone number not found',
      );
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Set OTP expiry to 5 minutes from now
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    // Create new OTP record
    const otp = this.otpRepository.create({
      userId,
      otp: otpCode,
      otpType: OtpType.PHONE,
      purpose: OtpPurpose.PHONE_VERIFICATION,
      expiresAt,
      isUsed: false,
    });

    await this.otpRepository.save(otp);


    // Send OTP via Termii SMS
    await this.sendOtpViaTermii(phone, otpCode);

    return {
      message: 'OTP sent successfully to your phone number',
      expiryInMinutes: 5,
      expiryTimestamp: expiresAt,
    };

  }

  async verifyPhoneOtp(
    userId: number,
    phone: string,
    otpCode: string,
  ): Promise<{ message: string; verified: boolean }> {
    try {
      // Find user by ID and phone number
      const user = await this.userRepository.findOne({
        where: { id: userId, phone },
      });

      if (!user) {
        ErrorHelper.NotFoundException(
          'User with this ID and phone number not found',
        );
      }

      // Find the most recent unused OTP for this user and phone
      const otp = await this.otpRepository.findOne({
        where: {
          userId,
          otp: otpCode,
          otpType: OtpType.PHONE,
          purpose: OtpPurpose.PHONE_VERIFICATION,
          isUsed: false,
        },
        order: { createdAt: 'DESC' },
      });

      if (!otp) {
        ErrorHelper.BadRequestException(
          'Invalid OTP or OTP not found. Please generate a new OTP.',
        );
      }

      // Check if OTP has expired
      if (otp.expiresAt < new Date()) {
        ErrorHelper.BadRequestException(
          'OTP has expired. Please generate a new OTP.',
        );
      }

      // Mark OTP as used
      await this.otpRepository.update(otp.id, { isUsed: true });

      // Update user as phone verified and set onboarding step to 1 (PHONE_VERIFICATION)
      await this.userRepository.update(userId, {
        isPhoneVerified: true,
        onboardingStep: OnboardingStep.PHONE_VERIFICATION,
      });

      return {
        message: 'Phone number verified successfully',
        verified: true,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      ErrorHelper.InternalServerErrorException('Failed to verify OTP');
    }
  }

  // KYC - dojah
  async verifyBvnWithSelfie(
    userId: number,
    bvn: string,
    selfieImageFile: Express.Multer.File,
  ): Promise<KycVerificationResponseDto> {
    try {
      // Get Dojah API configuration
      const dojahBaseUrl = this.configService.get<string>(
        'DOJAH_BASE_URL',
        'https://api.dojah.io',
      );
      const dojahAppId = this.configService.get<string>('DOJAH_APP_ID');
      const dojahPublicKey = this.configService.get<string>('DOJAH_PUBLIC_KEY');

      if (!dojahAppId || !dojahPublicKey) {
        ErrorHelper.InternalServerErrorException(
          'Dojah API credentials not configured',
        );
      }

      // Find user by ID
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        ErrorHelper.NotFoundException('User not found');
      }

      // Validate file type and size
      if (!selfieImageFile) {
        ErrorHelper.BadRequestException('Selfie image file is required');
      }

      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedMimeTypes.includes(selfieImageFile.mimetype)) {
        ErrorHelper.BadRequestException(
          'Invalid file type. Only JPEG and PNG images are supported.',
        );
      }

      // Check file size (max 5MB)
      const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
      if (selfieImageFile.size > maxSizeInBytes) {
        ErrorHelper.BadRequestException(
          'File size too large. Maximum size allowed is 5MB.',
        );
      }

      // Convert file buffer to base64
      const base64Image = selfieImageFile.buffer.toString('base64');

      // Format according to Dojah docs - ensure it starts with /9 for JPEG
      let formattedSelfieImage = base64Image;

      // For non-JPEG images, we might need to convert or validate differently
      if (selfieImageFile.mimetype === 'image/png') {
        // PNG images have different base64 headers, but Dojah expects JPEG format
        // You might want to convert PNG to JPEG here if needed
        console.warn('PNG image provided. Dojah API expects JPEG format.');
      }

      // Validate that the base64 string starts with expected JPEG signature
      if (!formattedSelfieImage.startsWith('/9')) {
        ErrorHelper.BadRequestException(
          'Invalid image format. The image must be a valid JPEG file.',
        );
      }

      // Call Dojah API for BVN verification with selfie
      const response = await firstValueFrom(
        this.httpService.post(
          `${dojahBaseUrl}/api/v1/kyc/bvn/verify`,
          {
            bvn: bvn,
            selfie_image: formattedSelfieImage,
          },
          {
            headers: {
              'AppId': dojahAppId,
              'Authorization': dojahPublicKey,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const verificationData = response.data?.entity;

      if (!verificationData) {
        ErrorHelper.InternalServerErrorException('Invalid response from Dojah API');
      }

      // Check if verification was successful
      const selfieVerification = verificationData.selfie_verification;
      const isVerified = selfieVerification?.match === true;

      // If verification is successful, update user's BVN and onboarding step
      if (isVerified) {
        await this.userRepository.update(userId, {
          bvn: bvn,
          onboardingStep: OnboardingStep.KYC_VERIFICATION,
        });

        // Try to provision wallet if utilities are available
        // TODO: Provision wallet
      }

      // Return response based on verification result
      if (isVerified) {
        return {
          message: 'BVN verification completed successfully',
          first_name: verificationData.first_name,
          middle_name: verificationData.middle_name,
          last_name: verificationData.last_name,
        };
      } else {
        return {
          message: 'BVN verification failed - selfie does not match BVN records',
        };
      }
    } catch (error) {
      console.error(
        'Dojah BVN verification failed:',
        error.response?.data || error.message,
      );

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      if (error.response?.status === 401) {
        ErrorHelper.UnauthorizedException('Invalid Dojah API credentials');
      }

      if (error.response?.status === 403) {
        ErrorHelper.UnauthorizedException('Insufficient permissions for Dojah API');
      }

      ErrorHelper.InternalServerErrorException(
        'Failed to verify BVN with selfie',
      );
    }
  }


  // Pin creation
  async createPin(userId: number, pin: string): Promise<CreatePinResponseDto> {
    try {
      // Validate PIN format (4 digits only)
      if (!/^\d{4}$/.test(pin)) {
        ErrorHelper.BadRequestException('PIN must be exactly 4 digits');
      }

      // Find user by ID
      const user = await this.userRepository.findOne({ where: { id: userId } });

      if (!user) {
        ErrorHelper.NotFoundException('User not found');
      }

      // Encrypt the PIN
      const encryptedPin = CryptoUtil.encryptPin(pin);

      // Update user with encrypted PIN
      await this.userRepository.update(userId, {
        pin: encryptedPin,
      });

      return {
        message: 'PIN created successfully',
        success: true,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      ErrorHelper.InternalServerErrorException('Failed to create PIN');
    }
  }

  async generateCreatePinOtp(userId: number): Promise<{
    message: string;
    maskedPhone: string;
    expiryInMinutes: number;
  }> {
    try {
      // Find user by ID
      const user = await this.userRepository.findOne({ where: { id: userId } });

      if (!user) {
        ErrorHelper.NotFoundException('User not found');
      }

      if (!user.phone) {
        ErrorHelper.BadRequestException('User has no phone number on file');
      }

      // Check if user already has a PIN
      if (user.pin) {
        ErrorHelper.BadRequestException('User already has a PIN set');
      }

      // Generate 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Set OTP expiry to 5 minutes from now
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 5);

      // Create new OTP record for PIN creation
      const otp = this.otpRepository.create({
        userId: user.id,
        otp: otpCode,
        otpType: OtpType.PHONE,
        purpose: OtpPurpose.PIN_CREATION,
        expiresAt,
      });

      await this.otpRepository.save(otp);

      // Send OTP via Termii SMS
      await this.sendOtpViaTermii(user.phone, otpCode);

      return {
        message: 'OTP sent successfully to your phone number',
        maskedPhone: this.maskPhoneNumber(user.phone),
        expiryInMinutes: 5,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      ErrorHelper.InternalServerErrorException('Failed to generate PIN creation OTP');
    }
  }

  async verifyCreatePinOtp(userId: number, otpCode: string): Promise<{
    message: string;
    verified: boolean;
    reference: string;
  }> {
    try {
      // Find the most recent unused OTP for PIN creation
      const otp = await this.otpRepository.findOne({
        where: {
          userId,
          otp: otpCode,
          purpose: OtpPurpose.PIN_CREATION,
          isUsed: false,
        },
        order: { createdAt: 'DESC' },
      });

      if (!otp) {
        ErrorHelper.BadRequestException('Invalid OTP code');
      }

      // Check if OTP has expired
      if (new Date() > otp.expiresAt) {
        ErrorHelper.BadRequestException('OTP has expired. Please request a new one');
      }

      // Mark OTP as used
      otp.isUsed = true;
      await this.otpRepository.save(otp);

      // Generate a shorter reference (6 characters) that fits in the OTP field
      const reference = require('crypto').randomBytes(3).toString('hex'); // 6 character hex string

      // Store the reference temporarily using the OTP field (which is 6 chars max)
      const referenceOtp = this.otpRepository.create({
        userId,
        otp: reference,
        otpType: OtpType.PHONE,
        purpose: OtpPurpose.PIN_CREATION,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes validity
        isUsed: false,
      });

      await this.otpRepository.save(referenceOtp);

      return {
        message: 'OTP verified successfully. You can now create your PIN.',
        verified: true,
        reference,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      ErrorHelper.InternalServerErrorException('Failed to verify PIN creation OTP');
    }
  }

  async createPinWithReference(userId: number, pin: string, reference: string): Promise<{
    message: string;
    success: boolean;
  }> {
    try {
      // Validate PIN format (4 digits only)
      if (!/^\d{4}$/.test(pin)) {
        ErrorHelper.BadRequestException('PIN must be exactly 4 digits');
      }

      // Find user by ID
      const user = await this.userRepository.findOne({ where: { id: userId } });

      if (!user) {
        ErrorHelper.NotFoundException('User not found');
      }

      // Check if user already has a PIN
      if (user.pin) {
        ErrorHelper.BadRequestException('User already has a PIN set');
      }

      // Verify the reference UUID
      const referenceOtp = await this.otpRepository.findOne({
        where: {
          userId,
          otp: reference, // We stored the reference in the otp field
          purpose: OtpPurpose.PIN_CREATION,
          isUsed: false,
        },
        order: { createdAt: 'DESC' },
      });

      if (!referenceOtp) {
        ErrorHelper.BadRequestException('Invalid or expired reference');
      }

      // Check if reference has expired
      if (new Date() > referenceOtp.expiresAt) {
        ErrorHelper.BadRequestException('Reference has expired. Please generate a new OTP');
      }

      // Mark reference as used
      referenceOtp.isUsed = true;
      await this.otpRepository.save(referenceOtp);

      // Encrypt the PIN
      const encryptedPin = CryptoUtil.encryptPin(pin);

      // Update user with encrypted PIN and advance onboarding step
      await this.userRepository.update(userId, {
        pin: encryptedPin,
        onboardingStep: OnboardingStep.AUTHENTICATION_PIN,
        isOnboardingCompleted: true, // PIN creation is the final step
      });

      return {
        message: 'PIN created successfully',
        success: true,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      ErrorHelper.InternalServerErrorException('Failed to create PIN');
    }
  }

  // Password api
  async forgotPassword(email: string): Promise<{
    message: string;
    maskedPhone: string;
    expiryInMinutes: number;
  }> {
    try {
      // Find user by email
      const user = await this.userRepository.findOne({ where: { email } });

      if (!user) {
        ErrorHelper.NotFoundException('User with this email not found');
      }

      if (!user.phone) {
        ErrorHelper.BadRequestException('User has no phone number on file');
      }

      // Generate 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Set OTP expiry to 5 minutes from now
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 5);

      // Create new OTP record for password reset
      const otp = this.otpRepository.create({
        userId: user.id,
        otp: otpCode,
        otpType: OtpType.PHONE,
        expiresAt,
        isUsed: false,
        purpose: OtpPurpose.PASSWORD_RESET,
      });

      await this.otpRepository.save(otp);

      // Send OTP via Termii SMS
      await this.sendOtpViaTermii(user.phone, otpCode);

      // Return masked phone number
      const maskedPhone = this.maskPhoneNumber(user.phone);

      return {
        message: 'OTP sent successfully to your phone number',
        maskedPhone,
        expiryInMinutes: 5,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      ErrorHelper.InternalServerErrorException(
        'Failed to send forgot password OTP',
      );
    }
  }

  private async sendOtpViaTermii(phoneNumber: string, otp: string): Promise<void> {
    try {
      const termiiBaseUrl = this.configService.get<string>(
        'TERMII_BASE_URL',
        'https://api.ng.termii.com',
      );
      const termiiApiKey = this.configService.get<string>('TERMII_API_KEY');
      const senderId = this.configService.get<string>(
        'TERMII_SENDER_ID',
        'NQkly',
      );
      const channel = this.configService.get<string>(
        'TERMII_CHANNEL',
        'generic',
      );

      if (!termiiApiKey) {
        ErrorHelper.InternalServerErrorException(
          'Termii SMS API key not configured',
        );
      }

      const message = `Your Qkly OTP is: ${otp}. This code expires in 5 minutes. Do not share this code with anyone.`;

      // Format payload according to Termii SMS API documentation
      const payload = {
        to: phoneNumber,
        from: senderId,
        sms: message,
        type: 'plain',
        channel: channel,
        api_key: termiiApiKey,
      };


      const response = await firstValueFrom(
        this.httpService.post(`${termiiBaseUrl}/api/sms/send`, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );

      if (!response.data.message_id || response.data.message !== 'Successfully Sent') {
        ErrorHelper.InternalServerErrorException(
          'Failed to send SMS via Termii API',
        );
      }
    } catch (error) {
      console.error(
        'Failed to send SMS via Termii:',
        error.response?.data || error.message,
      );
      // In development, don't fail the request if SMS sending fails
      if (this.configService.get<string>('NODE_ENV') === 'production') {
        ErrorHelper.InternalServerErrorException('Failed to send SMS');
      }
    }
  }

  private maskPhoneNumber(phone: string): string {
    // Remove any non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');

    if (cleanPhone.length < 6) {
      return phone; // Return original if too short to mask
    }

    // Mask middle digits, showing first 4 and last 2 digits
    // Example: 08123456789 becomes 0812*****89
    const firstPart = cleanPhone.substring(0, 4);
    const lastPart = cleanPhone.substring(cleanPhone.length - 2);
    const maskedMiddle = '*'.repeat(Math.max(cleanPhone.length - 6, 5));

    return `${firstPart}${maskedMiddle}${lastPart}`;
  }

  async verifyPasswordResetOtp(
    email: string,
    otpCode: string,
  ): Promise<{ verified: boolean; resetToken?: string }> {
    try {
      // Find user by email
      const user = await this.userRepository.findOne({ where: { email } });

      if (!user) {
        ErrorHelper.NotFoundException('User with this email not found');
      }

      // Find the most recent unused password reset OTP for this user
      const otp = await this.otpRepository.findOne({
        where: {
          userId: user.id,
          otp: otpCode,
          otpType: OtpType.PHONE,
          purpose: OtpPurpose.PASSWORD_RESET,
          isUsed: false,
        },
        order: { createdAt: 'DESC' },
      });

      if (!otp) {
        ErrorHelper.BadRequestException(
          'Invalid OTP or OTP not found. Please request a new password reset.',
        );
      }

      // Check if OTP has expired
      if (otp.expiresAt < new Date()) {
        ErrorHelper.BadRequestException(
          'OTP has expired. Please request a new password reset.',
        );
      }

      // Mark OTP as used
      await this.otpRepository.update(otp.id, { isUsed: true });

      // Generate a UUID reset token (valid for 15 minutes)
      const resetToken = require('crypto').randomUUID();

      // Store the reset token in the OTP table for 15 minutes validity
      const resetTokenOtp = this.otpRepository.create({
        userId: user.id,
        otp: resetToken, // Store the full UUID
        otpType: OtpType.EMAIL, // Use EMAIL type for reset tokens
        purpose: OtpPurpose.PASSWORD_RESET,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes validity
        isUsed: false,
      });

      await this.otpRepository.save(resetTokenOtp);

      return {
        verified: true,
        resetToken,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      ErrorHelper.InternalServerErrorException(
        'Failed to verify password reset OTP',
      );
    }
  }


  async resetPassword(
    newPassword: string,
    resetToken: string,
  ): Promise<{ message: string; success: boolean }> {
    try {
      // Find the reset token in the database
      const tokenRecord = await this.otpRepository.findOne({
        where: {
          otp: resetToken, // Full UUID stored in OTP field
          otpType: OtpType.EMAIL,
          purpose: OtpPurpose.PASSWORD_RESET,
          isUsed: false,
        },
        order: { createdAt: 'DESC' },
      });

      if (!tokenRecord) {
        ErrorHelper.UnauthorizedException('Invalid or expired reset token');
      }

      // Check if token has expired
      if (tokenRecord.expiresAt < new Date()) {
        ErrorHelper.UnauthorizedException('Reset token has expired');
      }

      // Find user by ID from token record
      const user = await this.userRepository.findOne({
        where: { id: tokenRecord.userId },
      });

      if (!user) {
        ErrorHelper.NotFoundException('User not found');
      }

      // Mark the reset token as used
      await this.otpRepository.update(tokenRecord.id, { isUsed: true });

      // Hash the new password
      const hashedPassword = CryptoUtil.hashPassword(newPassword);

      // Update user's password
      await this.userRepository.update(user.id, {
        password: hashedPassword,
      });

      // Invalidate any remaining unused password reset OTPs for this user for security
      await this.otpRepository.update(
        {
          userId: user.id,
          purpose: OtpPurpose.PASSWORD_RESET,
          isUsed: false,
        },
        { isUsed: true },
      );

      return {
        message: 'Password reset successfully',
        success: true,
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      ErrorHelper.InternalServerErrorException('Failed to reset password');
    }
  }


  async changePassword(
    changePassword: ChangePasswordDto
  ): Promise<any> {
    try {

      // Validate inputs
      if (!changePassword.userId || !changePassword.oldPassword || !changePassword.newPassword) {
        ErrorHelper.BadRequestException('User ID, old password, and new password are required');
      }

      if (changePassword.oldPassword === changePassword.newPassword) {
        ErrorHelper.BadRequestException('New password must be different from old password');
      }

      if (changePassword.newPassword !== changePassword.confirmPassword) {
        ErrorHelper.BadRequestException('password must match')
      }

      // Find user by ID
      const user = await this.userRepository.findOne({ where: { id: Number(changePassword.userId) } });
      if (!user) {
        ErrorHelper.NotFoundException('User not found');
      }

      // Verify old password matches
      if (!CryptoUtil.verifyPassword(changePassword.oldPassword, user.password)) {
        ErrorHelper.UnauthorizedException('Invalid current password');
      }

      // Hash new password
      const hashedPassword = CryptoUtil.hashPassword(changePassword.newPassword);

      // Update user password
      await this.userRepository.update(changePassword.userId, { password: hashedPassword });

      this.logger.log(`Password changed successfully for user ${changePassword.userId}`);

      return
    } catch (error) {
      this.logger.error(`Failed to change password for user ${changePassword.userId}:`, error);
      ErrorHelper.InternalServerErrorException('Failed to change password');
    }
  }


  async updateUserProfile(
    userId: number,
    updateUserProfileDto: UpdateUserProfileDto,
  ): Promise<{ message: string; user: Partial<User> }> {
    try {
      // Find user by ID
      const user = await this.userRepository.findOne({ where: { id: userId } });

      if (!user) {
        ErrorHelper.NotFoundException('User not found');
      }

      // Check if email is being updated and if it's already taken
      if (updateUserProfileDto.email && updateUserProfileDto.email !== user.email) {
        const existingUser = await this.userRepository.findOne({
          where: { email: updateUserProfileDto.email },
        });

        if (existingUser) {
          ErrorHelper.ConflictException('Email already in use by another user');
        }
      }

      // Check if phone is being updated and if it's already taken
      if (updateUserProfileDto.phone && updateUserProfileDto.phone !== user.phone) {
        const existingUser = await this.userRepository.findOne({
          where: { phone: updateUserProfileDto.phone },
        });

        if (existingUser) {
          ErrorHelper.ConflictException('Phone number already in use by another user');
        }
      }

      // Update user fields
      if (updateUserProfileDto.firstName !== undefined) {
        user.firstName = updateUserProfileDto.firstName;
      }
      if (updateUserProfileDto.lastName !== undefined) {
        user.lastName = updateUserProfileDto.lastName;
      }
      if (updateUserProfileDto.email !== undefined) {
        user.email = updateUserProfileDto.email;
        // Reset email verification if email is changed
        user.isEmailVerified = false;
      }
      if (updateUserProfileDto.phone !== undefined) {
        user.phone = updateUserProfileDto.phone;
        // Reset phone verification if phone is changed
        user.isPhoneVerified = false;
      }

      const updatedUser = await this.userRepository.save(user);

      // Return user without sensitive data
      const { password, pin, ...userWithoutSensitiveData } = updatedUser;

      this.logger.log(`User profile updated successfully for user ${userId}`);

      return {
        message: 'User profile updated successfully',
        user: userWithoutSensitiveData,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(`Failed to update user profile for user ${userId}:`, error);
      ErrorHelper.InternalServerErrorException('Failed to update user profile');
    }
  }


  async changePin(
    changePinDto: ChangePinDto,
  ): Promise<{ message: string; success: boolean }> {
    try {
      // Validate PIN format (4 digits only)
      if (!/^\d{4}$/.test(changePinDto.newPin)) {
        ErrorHelper.BadRequestException('New PIN must be exactly 4 digits');
      }

      if (changePinDto.newPin !== changePinDto.confirmPin) {
        ErrorHelper.BadRequestException('New PIN and confirm PIN do not match');
      }

      if (changePinDto.oldPin === changePinDto.newPin) {
        ErrorHelper.BadRequestException('New PIN must be different from old PIN');
      }

      // Find user by ID
      const user = await this.userRepository.findOne({
        where: { id: changePinDto.userId },
      });

      if (!user) {
        ErrorHelper.NotFoundException('User not found');
      }

      if (!user.pin) {
        ErrorHelper.BadRequestException('User does not have a PIN set. Please create a PIN first.');
      }

      // Verify old PIN
      const isOldPinValid = CryptoUtil.verifyPin(changePinDto.oldPin, user.pin);
      if (!isOldPinValid) {
        ErrorHelper.UnauthorizedException('Invalid current PIN');
      }

      // Encrypt the new PIN
      const encryptedPin = CryptoUtil.encryptPin(changePinDto.newPin);

      // Update user with new encrypted PIN
      await this.userRepository.update(changePinDto.userId, {
        pin: encryptedPin,
      });

      this.logger.log(`PIN changed successfully for user ${changePinDto.userId}`);

      return {
        message: 'PIN changed successfully',
        success: true,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to change PIN for user ${changePinDto.userId}:`,
        error,
      );
      ErrorHelper.InternalServerErrorException('Failed to change PIN');
    }
  }




  async checkUser(
    identifier: string | number,
    identifierType: 'id' | 'email' | 'phone' = 'id',
  ): Promise<User> {
    try {
      // Build where clause based on identifier type
      let whereClause: any;

      if (identifierType === 'id') {
        whereClause = { id: Number(identifier) };
      } else if (identifierType === 'email') {
        whereClause = { email: identifier };
      } else if (identifierType === 'phone') {
        whereClause = { phone: identifier };
      } else {
        ErrorHelper.BadRequestException(`Invalid identifier type: ${identifierType}`);
      }

      // Find user
      const user = await this.userRepository.findOne({ where: whereClause });

      if (!user) {
        ErrorHelper.NotFoundException(
          `User not found with ${identifierType}: ${identifier}`,
        );
      }

      return user;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Error checking user with ${identifierType}: ${identifier}`,
        error,
      );
      ErrorHelper.InternalServerErrorException('Failed to check user');
    }
  }

  async loginWithPin(phone: string, pin: string): Promise<LoginResponseDto> {
    if (!phone || !pin) {
      ErrorHelper.BadRequestException('Phone and PIN are required');
    }

    const user = await this.userRepository.findOne({
      where: { phone },
    });


    if (!user) {
      ErrorHelper.UnauthorizedException('Invalid credentials');
    }

    if (!user.pin) {
      ErrorHelper.UnauthorizedException('Invalid credentials');
    }

    if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
      const remainingMs = user.pinLockedUntil.getTime() - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
      ErrorHelper.UnauthorizedException(
        `Account locked due to too many failed PIN attempts. Try again in ${remainingMinutes} minute(s).`,
      );
    }

    const isPinValid = CryptoUtil.verifyPin(pin, user.pin);
    if (!isPinValid) {
      const newAttempts = (user.pinFailedAttempts || 0) + 1;
      const updates: Partial<User> = { pinFailedAttempts: newAttempts };

      if (newAttempts >= this.MAX_PIN_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + this.PIN_LOCK_MINUTES * 60 * 1000);
        updates.pinLockedUntil = lockUntil;
      }

      await this.userRepository.update(user.id, updates);

      ErrorHelper.UnauthorizedException('Invalid credentials');
    }

    if (user.pinFailedAttempts && user.pinFailedAttempts > 0) {
      await this.userRepository.update(user.id, {
        pinFailedAttempts: 0,
        pinLockedUntil: null,
      });
    }

    const payload = {
      sub: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      deviceId: user.deviceId,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      message: 'User logged in successfully',
      accessToken,
      tokenType: 'Bearer',
      expiresIn: EXPIRATION_TIME_SECONDS,
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      onboardingStep: user.onboardingStep,
    };

  }

}