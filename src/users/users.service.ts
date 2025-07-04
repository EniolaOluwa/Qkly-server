import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user.entity';
import { Otp, OtpType } from '../otp.entity';
import { RegisterUserDto } from '../dto/responses.dto';
import { CryptoUtil } from '../utils/crypto.util';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Otp)
    private otpRepository: Repository<Otp>,
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
}
