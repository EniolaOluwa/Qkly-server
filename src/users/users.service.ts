import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { User } from './user.entity';
import { Otp, OtpType, OtpPurpose } from './otp.entity';
import { OnboardingStep } from './onboarding-step.enum';
import {
  RegisterUserDto,
  LoginDto,
  LoginResponseDto,
  KycVerificationResponseDto,
  CreatePinResponseDto,
} from '../dto/responses.dto';
import { CryptoUtil } from '../utils/crypto.util';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Otp)
    private otpRepository: Repository<Otp>,
    private jwtService: JwtService,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  async registerUser(
    registerUserDto: RegisterUserDto,
  ): Promise<{ message: string; userId: number; email: string }> {
    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findOne({
        where: { email: registerUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
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

      return {
        message: 'User registered successfully',
        userId: savedUser.id,
        email: savedUser.email,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to register user');
    }
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findUserById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async loginUser(loginDto: LoginDto): Promise<LoginResponseDto> {
    try {
      // Find user by email
      const user = await this.userRepository.findOne({
        where: { email: loginDto.email },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid email or password');
      }

      // Verify password
      if (!CryptoUtil.verifyPassword(loginDto.password, user.password)) {
        throw new UnauthorizedException('Invalid email or password');
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
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to login user');
    }
  }

  async generatePhoneOtp(
    userId: number,
    phone: string,
  ): Promise<{ message: string; expiryInMinutes: number; expiryTimestamp: Date }> {
    try {
      // Find user by ID and phone number
      const user = await this.userRepository.findOne({
        where: { id: userId, phone },
      });

      if (!user) {
        throw new NotFoundException(
          'User with this ID and phone number not found',
        );
      }

      // Generate 6-digit OTP
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
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to generate OTP');
    }
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
        throw new NotFoundException(
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
        throw new BadRequestException(
          'Invalid OTP or OTP not found. Please generate a new OTP.',
        );
      }

      // Check if OTP has expired
      if (otp.expiresAt < new Date()) {
        throw new BadRequestException(
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
      throw new InternalServerErrorException('Failed to verify OTP');
    }
  }

  async getKycVerificationDetails(
    referenceId: string,
  ): Promise<KycVerificationResponseDto> {
    try {
      const premblyBaseUrl = this.configService.get<string>(
        'PREMBLY_BASE_URL',
        'https://api.prembly.com',
      );
      const premblyApiKey = this.configService.get<string>('PREMBLY_API_KEY');

      if (!premblyApiKey) {
        throw new InternalServerErrorException(
          'Prembly API credentials not configured',
        );
      }

      // Call Prembly API to get verification status by reference ID
      const response = await firstValueFrom(
        this.httpService.get(`${premblyBaseUrl}/identitypass/verification/${referenceId}/status`, {
          headers: {
            'x-api-key': premblyApiKey,
            'Content-Type': 'application/json',
          },
        }),
      );

      const fullResponse = response.data;
      const verificationData = fullResponse?.data;

      if (!verificationData) {
        throw new NotFoundException('Verification data not found');
      }

      // Map Prembly response to our DTO
      const isVerified = verificationData.verification_status === 'VERIFIED';
      
      return {
        status: fullResponse.status === true,
        message: isVerified 
          ? 'Verification completed successfully' 
          : `Verification ${verificationData.verification_status?.toLowerCase() || 'failed'}`,
        reference_id: verificationData.reference || referenceId,
        verification_status: verificationData.verification_status || 'UNKNOWN',
        response_code: verificationData.response_code || '',
        created_at: verificationData.created_at || '',
      };
    } catch (error) {
      console.error(
        'Prembly KYC verification details failed:',
        error.response?.data || error.message,
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      if (error.response?.status === 404) {
        throw new NotFoundException('Verification reference ID not found');
      }

      if (error.response?.status === 401) {
        throw new UnauthorizedException('Invalid Prembly API credentials');
      }

      if (error.response?.status === 403) {
        throw new UnauthorizedException('Insufficient permissions for Prembly API');
      }

      throw new InternalServerErrorException(
        'Failed to retrieve KYC verification details',
      );
    }
  }

  async createPin(userId: number, pin: string): Promise<CreatePinResponseDto> {
    try {
      // Validate PIN format (4 digits only)
      if (!/^\d{4}$/.test(pin)) {
        throw new BadRequestException('PIN must be exactly 4 digits');
      }

      // Find user by ID
      const user = await this.userRepository.findOne({ where: { id: userId } });

      if (!user) {
        throw new NotFoundException('User not found');
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
      throw new InternalServerErrorException('Failed to create PIN');
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
        throw new NotFoundException('User not found');
      }

      if (!user.phone) {
        throw new BadRequestException('User has no phone number on file');
      }

      // Check if user already has a PIN
      if (user.pin) {
        throw new BadRequestException('User already has a PIN set');
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
      throw new InternalServerErrorException('Failed to generate PIN creation OTP');
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
        throw new BadRequestException('Invalid OTP code');
      }

      // Check if OTP has expired
      if (new Date() > otp.expiresAt) {
        throw new BadRequestException('OTP has expired. Please request a new one');
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
      throw new InternalServerErrorException('Failed to verify PIN creation OTP');
    }
  }

  async createPinWithReference(userId: number, pin: string, reference: string): Promise<{
    message: string;
    success: boolean;
  }> {
    try {
      // Validate PIN format (4 digits only)
      if (!/^\d{4}$/.test(pin)) {
        throw new BadRequestException('PIN must be exactly 4 digits');
      }

      // Find user by ID
      const user = await this.userRepository.findOne({ where: { id: userId } });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check if user already has a PIN
      if (user.pin) {
        throw new BadRequestException('User already has a PIN set');
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
        throw new BadRequestException('Invalid or expired reference');
      }

      // Check if reference has expired
      if (new Date() > referenceOtp.expiresAt) {
        throw new BadRequestException('Reference has expired. Please generate a new OTP');
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
      throw new InternalServerErrorException('Failed to create PIN');
    }
  }

  async forgotPassword(email: string): Promise<{
    message: string;
    maskedPhone: string;
    expiryInMinutes: number;
  }> {
    try {
      // Find user by email
      const user = await this.userRepository.findOne({ where: { email } });

      if (!user) {
        throw new NotFoundException('User with this email not found');
      }

      if (!user.phone) {
        throw new BadRequestException('User has no phone number on file');
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
      throw new InternalServerErrorException(
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
        throw new InternalServerErrorException(
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

      console.log(`Sending OTP via Termii SMS to ${phoneNumber}: ${otp}`); // For development/testing

      const response = await firstValueFrom(
        this.httpService.post(`${termiiBaseUrl}/api/sms/send`, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );

      if (!response.data.message_id || response.data.message !== 'Successfully Sent') {
        throw new InternalServerErrorException(
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
        throw new InternalServerErrorException('Failed to send SMS');
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
  ): Promise<{ message: string; verified: boolean; resetToken?: string }> {
    try {
      // Find user by email
      const user = await this.userRepository.findOne({ where: { email } });

      if (!user) {
        throw new NotFoundException('User with this email not found');
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
        throw new BadRequestException(
          'Invalid OTP or OTP not found. Please request a new password reset.',
        );
      }

      // Check if OTP has expired
      if (otp.expiresAt < new Date()) {
        throw new BadRequestException(
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
        message: 'OTP verified successfully. You can now reset your password.',
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
      throw new InternalServerErrorException(
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
        throw new UnauthorizedException('Invalid or expired reset token');
      }

      // Check if token has expired
      if (tokenRecord.expiresAt < new Date()) {
        throw new UnauthorizedException('Reset token has expired');
      }

      // Find user by ID from token record
      const user = await this.userRepository.findOne({
        where: { id: tokenRecord.userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
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
      throw new InternalServerErrorException('Failed to reset password');
    }
  }
}
