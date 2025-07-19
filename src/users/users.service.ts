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
import { firstValueFrom } from 'rxjs';
import { User } from '../user.entity';
import { Otp, OtpType } from '../otp.entity';
import { RegisterUserDto, LoginDto, LoginResponseDto, KycVerificationResponseDto } from '../dto/responses.dto';
import { CryptoUtil } from '../utils/crypto.util';

@Injectable()
export class UsersService {
  // Mock Dojah API credentials - In production, these should be environment variables
  private readonly DOJAH_BASE_URL = 'https://api.dojah.io';
  private readonly DOJAH_APP_ID = 'mock-app-id-12345';
  private readonly DOJAH_SECRET_KEY = 'mock-secret-key-abcdefghijklmnop';

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Otp)
    private otpRepository: Repository<Otp>,
    private jwtService: JwtService,
    private httpService: HttpService,
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

  async generatePhoneOtp(userId: number, phone: string): Promise<{ message: string; expiryInMinutes: number }> {
    try {
      // Find user by ID and phone number
      const user = await this.userRepository.findOne({ where: { id: userId, phone } });
      
      if (!user) {
        throw new NotFoundException('User with this ID and phone number not found');
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

  async verifyPhoneOtp(userId: number, phone: string, otpCode: string): Promise<{ message: string; verified: boolean }> {
    try {
      // Find user by ID and phone number
      const user = await this.userRepository.findOne({ where: { id: userId, phone } });
      
      if (!user) {
        throw new NotFoundException('User with this ID and phone number not found');
      }

      // Find the most recent unused OTP for this user and phone
      const otp = await this.otpRepository.findOne({
        where: { 
          userId, 
          otp: otpCode, 
          otpType: OtpType.PHONE,
          isUsed: false 
        },
        order: { createdAt: 'DESC' },
      });

      if (!otp) {
        throw new BadRequestException('Invalid OTP or OTP not found. Please generate a new OTP.');
      }

      // Check if OTP has expired
      if (otp.expiresAt < new Date()) {
        throw new BadRequestException('OTP has expired. Please generate a new OTP.');
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
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to verify OTP');
    }
  }

  async getKycVerificationDetails(referenceId: string): Promise<KycVerificationResponseDto> {
    try {
      // Call Dojah API to get verification details by reference ID
      const response = await firstValueFrom(
        this.httpService.get(`${this.DOJAH_BASE_URL}/api/v1/kyc/verification`, {
          headers: {
            'AppId': this.DOJAH_APP_ID,
            'Authorization': this.DOJAH_SECRET_KEY,
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
      const bvnVerified = fullResponse?.data?.government_data?.status === true && !!bvnData;

      // Return only verification status
      return {
        status: fullResponse.status === true,
        message: bvnVerified ? 'BVN verification completed successfully' : 'BVN verification failed',
        reference_id: referenceId,
        bvn_verified: bvnVerified,
      };
    } catch (error) {
      console.error('Dojah KYC verification details failed:', error.response?.data || error.message);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      if (error.response?.status === 404) {
        throw new NotFoundException('Verification reference ID not found');
      }
      
      if (error.response?.status === 401) {
        throw new UnauthorizedException('Invalid Dojah API credentials');
      }
      
      throw new InternalServerErrorException('Failed to retrieve KYC verification details');
    }
  }
}
