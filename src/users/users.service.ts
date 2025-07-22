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
  ): Promise<{ message: string; expiryInMinutes: number }> {
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

      // In a real application, you would send the OTP via SMS here
      console.log(`OTP for ${phone}: ${otpCode}`); // For development/testing

      return {
        message: 'OTP sent successfully to your phone number',
        expiryInMinutes: 5,
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

      // Update user as phone verified
      await this.userRepository.update(userId, {
        isPhoneVerified: true,
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
      const dojahBaseUrl = this.configService.get<string>(
        'DOJAH_BASE_URL',
        'https://api.dojah.io',
      );
      const dojahAppId = this.configService.get<string>('DOJAH_APP_ID');
      const dojahSecretKey = this.configService.get<string>('DOJAH_SECRET_KEY');

      if (!dojahAppId || !dojahSecretKey) {
        throw new InternalServerErrorException(
          'Dojah API credentials not configured',
        );
      }

      // Call Dojah API to get verification details by reference ID
      const response = await firstValueFrom(
        this.httpService.get(`${dojahBaseUrl}/api/v1/kyc/verification`, {
          headers: {
            AppId: dojahAppId,
            Authorization: dojahSecretKey,
            'Content-Type': 'application/json',
          },
          params: {
            reference_id: referenceId,
          },
        }),
      );

      const fullResponse = response.data;

      // Check if BVN verification exists and is successful
      const bvnData = fullResponse?.data?.government_data?.data?.bvn?.entity;
      const bvnVerified =
        fullResponse?.data?.government_data?.status === true && !!bvnData;

      // Return only verification status
      return {
        status: fullResponse.status === true,
        message: bvnVerified
          ? 'BVN verification completed successfully'
          : 'BVN verification failed',
        reference_id: referenceId,
        bvn_verified: bvnVerified,
      };
    } catch (error) {
      console.error(
        'Dojah KYC verification details failed:',
        error.response?.data || error.message,
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      if (error.response?.status === 404) {
        throw new NotFoundException('Verification reference ID not found');
      }

      if (error.response?.status === 401) {
        throw new UnauthorizedException('Invalid Dojah API credentials');
      }

      throw new InternalServerErrorException(
        'Failed to retrieve KYC verification details',
      );
    }
  }

  async createPin(userId: number, pin: string): Promise<CreatePinResponseDto> {
    try {
      // Validate PIN format (6 digits only)
      if (!/^\d{6}$/.test(pin)) {
        throw new BadRequestException('PIN must be exactly 6 digits');
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

      // Send OTP via Kudi SMS
      await this.sendOtpViaSms(user.phone, otpCode);

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

  private async sendOtpViaSms(phoneNumber: string, otp: string): Promise<void> {
    try {
      const kudiApiUrl = this.configService.get<string>(
        'KUDI_SMS_API_URL',
        'https://api.kudisms.com/api/v1',
      );
      const kudiApiKey = this.configService.get<string>('KUDI_SMS_API_KEY');
      const senderId = this.configService.get<string>(
        'KUDI_SMS_SENDER_ID',
        'NQkly',
      );

      if (!kudiApiKey) {
        throw new InternalServerErrorException(
          'Kudi SMS API key not configured',
        );
      }

      const message = `Your NQkly password reset OTP is: ${otp}. This code expires in 5 minutes. Do not share this code with anyone.`;

      // Format payload according to Kudi SMS API documentation
      const payload = {
        phone_number: phoneNumber,
        message: message,
        sender_id: senderId,
      };

      console.log(`Sending OTP via Kudi SMS to ${phoneNumber}: ${otp}`); // For development/testing

      const response = await firstValueFrom(
        this.httpService.post(`${kudiApiUrl}/send-sms-otp`, payload, {
          headers: {
            Authorization: `Bearer ${kudiApiKey}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      if (
        response.data.status !== 'success' &&
        response.data.success !== true
      ) {
        throw new InternalServerErrorException(
          'Failed to send SMS via Kudi API',
        );
      }
    } catch (error) {
      console.error(
        'Failed to send SMS via Kudi:',
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

      // Generate a short-lived reset token (valid for 15 minutes)
      const resetTokenPayload = {
        sub: user.id,
        email: user.email,
        purpose: 'password_reset',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900, // 15 minutes
      };

      const resetToken = this.jwtService.sign(resetTokenPayload);

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
      // Decode and verify the reset token
      let decodedToken;
      try {
        decodedToken = this.jwtService.verify(resetToken);
      } catch (error) {
        throw new UnauthorizedException('Invalid or expired reset token');
      }

      // Verify token purpose and structure
      if (
        !decodedToken.sub ||
        !decodedToken.email ||
        decodedToken.purpose !== 'password_reset'
      ) {
        throw new UnauthorizedException(
          'Invalid reset token - token not valid for password reset',
        );
      }

      // Find user by ID from token
      const user = await this.userRepository.findOne({
        where: { id: decodedToken.sub },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Verify the email in token matches user email (additional security check)
      if (user.email !== decodedToken.email) {
        throw new UnauthorizedException('Invalid reset token - user mismatch');
      }

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
