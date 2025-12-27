import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  InternalServerErrorException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { UserType } from '../../common/auth/user-role.enum';
import {
  CreatePinResponseDto,
  KycVerificationResponseDto,
  LoginDto,
  LoginResponseDto,
  RegisterUserDto,
  RegisterUserResponseDto
} from '../../common/dto/responses.dto';
import { CryptoUtil } from '../../common/utils/crypto.util';
import { WalletProvisioningUtil } from '../../common/utils/wallet-provisioning.util';
import { Role, RoleStatus } from '../roles/entities/role.entity';
import { UserProgressEvent } from '../user-progress/entities/user-progress.entity';
import { UserProgressService } from '../user-progress/user-progress.service';
import { ErrorHelper } from './../../common/utils/error.utils';
import { ChangeUserStatusDto } from './dto/change-user-status.dto';
import { OnboardingStep } from '../../common/enums/user.enum';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { ChangePasswordDto, ChangePinDto, UpdateUserProfileDto } from './dto/user.dto';
import { Otp, OtpPurpose, OtpType } from './entity/otp.entity';
import { User, UserStatus } from './entity/user.entity';
import { UserProfile } from './entities/user-profile.entity';
import { UserKYC } from './entities/user-kyc.entity';
import { UserSecurity } from './entities/user-security.entity';
import { UserOnboarding } from './entities/user-onboarding.entity';
import { UserMapper, MappedUser } from './mappers/user.mapper';
import { PaginationDto, PaginationResultDto } from '../../common/queries/dto';
import { permission } from 'process';
import { PhoneUtil, CountryCode } from '../../common/utils/phone.util';


const EXPIRATION_TIME_SECONDS = 3600; // 1 hour

@Injectable()
export class UsersService {

  private readonly logger = new Logger(UsersService.name);
  private readonly MAX_PIN_ATTEMPTS = 5;
  private readonly PIN_LOCK_MINUTES = 5;

  private readonly ONBOARDING_ORDER = [
    OnboardingStep.PERSONAL_INFORMATION,
    OnboardingStep.PHONE_VERIFICATION,
    OnboardingStep.KYC_VERIFICATION,
    OnboardingStep.BUSINESS_INFORMATION,
    OnboardingStep.AUTHENTICATION_PIN,
  ];

  private shouldUpdateStep(current: OnboardingStep, next: OnboardingStep): boolean {
    const currentIndex = this.ONBOARDING_ORDER.indexOf(current);
    const nextIndex = this.ONBOARDING_ORDER.indexOf(next);
    // Only update if next step is further ahead than current step
    return nextIndex > currentIndex;
  }


  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Otp)
    private otpRepository: Repository<Otp>,
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
    @InjectRepository(UserKYC)
    private userKycRepository: Repository<UserKYC>,
    @InjectRepository(UserSecurity)
    private userSecurityRepository: Repository<UserSecurity>,
    @InjectRepository(UserOnboarding)
    private userOnboardingRepository: Repository<UserOnboarding>,
    private jwtService: JwtService,
    private httpService: HttpService,
    private configService: ConfigService,
    private walletProvisioningUtil: WalletProvisioningUtil,
    private userProgressService: UserProgressService,
  ) { }


  async registerUser(
    registerUserDto: RegisterUserDto,
  ): Promise<RegisterUserResponseDto> {
    try {
      // Standardize phone number to E.164 format before any operations
      const standardizedPhone = PhoneUtil.standardize(
        registerUserDto.phone,
        CountryCode.NIGERIA,
      );

      // Check if user with email already exists
      const existingUserByEmail = await this.userRepository.findOne({
        where: { email: registerUserDto.email },
      });
      if (existingUserByEmail) {
        ErrorHelper.ConflictException('User with this email already exists');
      }

      // Check if user with phone already exists (using standardized format)
      const existingUserByPhone = await this.userProfileRepository.findOne({
        where: { phone: standardizedPhone },
      });
      if (existingUserByPhone) {
        ErrorHelper.ConflictException('User with this phone number already exists');
      }

      // Hash the password
      const hashedPassword = CryptoUtil.hashPassword(registerUserDto.password);

      // Get default Merchant role
      const merchantRole = await this.roleRepository.findOne({
        where: { name: 'Merchant', userType: UserType.USER },
      });
      if (!merchantRole) {
        this.logger.error('Merchant role not found in database!');
        ErrorHelper.InternalServerErrorException('System configuration error');
      }

      // Create new user (core authentication data only)
      const user = this.userRepository.create({
        email: registerUserDto.email,
        password: hashedPassword,
        userType: UserType.USER,
        roleId: merchantRole.id,
        status: UserStatus.ACTIVE,
      });

      // Save user to database
      const savedUser = await this.userRepository.save(user);

      // Create user profile with standardized phone number
      const userProfile = this.userProfileRepository.create({
        userId: savedUser.id,
        firstName: registerUserDto.firstname,
        lastName: registerUserDto.lastname,
        phone: standardizedPhone, // Store in E.164 format
        isPhoneVerified: false,
      });
      await this.userProfileRepository.save(userProfile);

      // Create user security record
      const userSecurity = this.userSecurityRepository.create({
        userId: savedUser.id,
        deviceId: registerUserDto.deviceid,
        longitude: registerUserDto.longitude,
        latitude: registerUserDto.latitude,
      });
      await this.userSecurityRepository.save(userSecurity);

      // Create user onboarding record
      const userOnboarding = this.userOnboardingRepository.create({
        userId: savedUser.id,
        currentStep: OnboardingStep.PERSONAL_INFORMATION,
        isCompleted: false,
        progressPercentage: 0,
      });
      await this.userOnboardingRepository.save(userOnboarding);

      // Fetch user with role and related entities
      const userWithRole = await this.userRepository.findOne({
        where: { id: savedUser.id },
        relations: ['role', 'profile', 'onboarding'],
      });

      // Generate JWT payload
      const payload = {
        sub: savedUser.id,
        email: savedUser.email,
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        deviceId: registerUserDto.deviceid,
        userType: savedUser.userType,
        roleName: userWithRole?.role?.name,
      };

      // Generate JWT token
      const accessToken = this.jwtService.sign(payload);

      // Return user information with token (phone in standardized format)
      return {
        message: 'User registered successfully',
        accessToken,
        tokenType: 'Bearer',
        expiresIn: EXPIRATION_TIME_SECONDS,
        userId: savedUser.id,
        email: savedUser.email,
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        phone: standardizedPhone, // Return standardized format
        isEmailVerified: savedUser.isEmailVerified,
        isPhoneVerified: userProfile.isPhoneVerified,
        onboardingStep: userOnboarding.currentStep,
      };
    } catch (error) {
      throw error
    }
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findUserById(id: number): Promise<MappedUser | null> {
    const user = await this.userRepository.findOne({
      where: { id }, relations: [
        'profile'
      ]
    });

    const mappedUsers = UserMapper.toMappedUser(user!);

    return mappedUsers
  }

  async loginUser(loginDto: LoginDto): Promise<LoginResponseDto> {
    // Find user by email with role and related entities
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
      relations: ['role', 'profile', 'security', 'onboarding'],
    });

    if (!user) {
      ErrorHelper.UnauthorizedException('Invalid email or password');
    }

    // Check user status
    if (user.status === UserStatus.SUSPENDED) {
      if (user.suspendedUntil && user.suspendedUntil > new Date()) {
        const remainingTime = Math.ceil(
          (user.suspendedUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        );
        ErrorHelper.UnauthorizedException(
          `Account suspended until ${user.suspendedUntil.toISOString()}. ${user.statusReason || ''} `,
        );
      } else if (!user.suspendedUntil) {
        ErrorHelper.UnauthorizedException(
          `Account suspended indefinitely.${user.statusReason || 'Contact support for assistance.'} `,
        );
      }
    }

    if (user.status === UserStatus.BANNED) {
      ErrorHelper.UnauthorizedException(
        `Account has been banned.${user.statusReason || 'Contact support for assistance.'} `,
      );
    }

    if (user.status === UserStatus.INACTIVE) {
      ErrorHelper.UnauthorizedException('Account is inactive. Contact support for assistance.');
    }

    // Verify password
    if (!CryptoUtil.verifyPassword(loginDto.password, user.password)) {
      ErrorHelper.UnauthorizedException('Invalid email or password');
    }

    // Update user security data (device ID, location, last login)
    if (user.security) {
      const securityUpdateData: any = {};

      if (loginDto.deviceid) {
        securityUpdateData.deviceId = loginDto.deviceid;
      }
      if (loginDto.longitude !== undefined) {
        securityUpdateData.longitude = loginDto.longitude;
      }
      if (loginDto.latitude !== undefined) {
        securityUpdateData.latitude = loginDto.latitude;
      }

      if (Object.keys(securityUpdateData).length > 0) {
        await this.userSecurityRepository.update(user.security.id, securityUpdateData);
      }
    }

    // Generate JWT payload
    const payload = {
      sub: user.id,
      email: user.email,
      firstName: user.profile?.firstName || '',
      lastName: user.profile?.lastName || '',
      deviceId: loginDto.deviceid,
      userType: user.userType,
      role: user.role?.userType,
      permissions: user.role?.permissions || [],
    };

    // Generate JWT token
    const accessToken = this.jwtService.sign(payload);

    // Return user information with token
    return {
      message: 'User logged in successfully',
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 3600,
      userId: user.id,
      email: user.email,
      firstName: user.profile?.firstName || '',
      lastName: user.profile?.lastName || '',
      phone: user.profile?.phone || '',
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.profile?.isPhoneVerified || false,
      onboardingStep: user.onboarding?.currentStep || OnboardingStep.PERSONAL_INFORMATION,
    };
  }


  // Termii sms otp
  async generatePhoneOtp(
    userId: number,
    phone: string,
  ): Promise<{ message: string; expiryInMinutes: number; expiryTimestamp: Date }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile'],
    });

    if (!user || user.profile?.phone !== phone) {
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
      // Find user by ID with profile and onboarding
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['profile', 'onboarding'],
      });

      if (!user || user.profile?.phone !== phone) {
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


      if (user.profile) {
        const a = await this.userProfileRepository.update(user.profile.id, {
          isPhoneVerified: true,
        });
      }

      // Update onboarding step to PHONE_VERIFICATION if appropriate
      if (user.onboarding) {
        const nextStep = OnboardingStep.PHONE_VERIFICATION;
        if (this.shouldUpdateStep(user.onboarding.currentStep, nextStep)) {
          await this.userOnboardingRepository.update(user.onboarding.id, {
            currentStep: nextStep,
          });
        }
      }

      return {
        message: 'Phone number verified successfully',
        verified: true,
      };
    } catch (error) {
      throw error
    }
  }

  // KYC - dojah
  async verifyBvnWithSelfie(
    userId: number,
    bvn: string,
    selfieImageFile: Express.Multer.File,
  ): Promise<KycVerificationResponseDto> {
    try {
      // Get Dojah API configurationx
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

      // Find user by ID with KYC and onboarding
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['kyc', 'onboarding'],
      });
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
          `${dojahBaseUrl} /api/v1 / kyc / bvn / verify`,
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

      // If verification is successful, update user's KYC and onboarding step
      if (isVerified) {
        // Create or update UserKYC record
        if (user.kyc) {
          await this.userKycRepository.update(user.kyc.id, {
            bvn: bvn,
            status: 'verified' as any,
            verificationProvider: 'dojah' as any,
            verificationResponse: verificationData,
            verifiedAt: new Date(),
          });
        } else {
          const userKyc = this.userKycRepository.create({
            userId,
            bvn: bvn,
            status: 'verified' as any,
            verificationProvider: 'dojah' as any,
            verificationResponse: verificationData,
            verifiedAt: new Date(),
          });
          await this.userKycRepository.save(userKyc);
        }

        // Update onboarding step
        if (user.onboarding) {
          const nextStep = OnboardingStep.KYC_VERIFICATION;
          if (this.shouldUpdateStep(user.onboarding.currentStep, nextStep)) {
            await this.userOnboardingRepository.update(user.onboarding.id, {
              currentStep: nextStep,
            });
          }
        }

        // Try to provision wallet if utilities are available
        try {
          const bvnVerificationData = {
            bvn: verificationData.bvn,
            customerName: `${verificationData.first_name} ${verificationData.last_name} `.trim(),
            firstName: verificationData.first_name,
            lastName: verificationData.last_name,
            dateOfBirth: verificationData.date_of_birth,
            verification_status: 'VERIFIED',
          };

          const walletResult = await this.walletProvisioningUtil.provisionWalletOnBvnSuccess(
            userId,
            user.email,
            bvnVerificationData,
          );

          if (walletResult.success) {
            console.log(`Wallet provisioned successfully for user ${userId}: `, walletResult.walletData);
          } else {
            console.warn(`Failed to provision wallet for user ${userId}: `, walletResult.error);
          }
        } catch (walletError) {
          // Log wallet provisioning error but don't fail the verification response
          console.error('Wallet provisioning failed:', walletError);
        }
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
      if (!/^\d{ 4 } $ /.test(pin)) {
        ErrorHelper.BadRequestException('PIN must be exactly 4 digits');
      }

      // Find user by ID with security
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['security'],
      });

      if (!user) {
        ErrorHelper.NotFoundException('User not found');
      }

      // Encrypt the PIN
      const encryptedPin = CryptoUtil.encryptPin(pin);

      // Create or update user security with PIN
      if (user.security) {
        await this.userSecurityRepository.update(user.security.id, {
          pin: encryptedPin,
        });
      } else {
        const userSecurity = this.userSecurityRepository.create({
          userId,
          pin: encryptedPin,
        });
        await this.userSecurityRepository.save(userSecurity);
      }

      // Update onboarding step to AUTHENTICATION_PIN and mark as completed
      if (user.onboarding) {
        user.onboarding.currentStep = OnboardingStep.AUTHENTICATION_PIN;
        user.onboarding.isCompleted = true;
        user.onboarding.completedAt = new Date();
        user.onboarding.progressPercentage = 100;
        await this.userOnboardingRepository.save(user.onboarding);
      }

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
    // Find user by ID with related entities
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile', 'security'],
    });

    if (!user) {
      ErrorHelper.NotFoundException('User not found');
    }

    if (!user.profile?.phone) {
      ErrorHelper.BadRequestException('User has no phone number on file');
    }

    // Check if user already has a PIN
    if (user.security?.pin) {
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
    await this.sendOtpViaTermii(user.profile.phone, otpCode);

    return {
      message: 'OTP sent successfully to your phone number',
      maskedPhone: this.maskPhoneNumber(user.profile.phone),
      expiryInMinutes: 5,
    };
  }

  async verifyCreatePinOtp(userId: number, otpCode: string): Promise<{
    message: string;
    verified: boolean;
    reference: string;
  }> {
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
  }

  async createPinWithReference(userId: number, pin: string, reference: string): Promise<{
    message: string;
    success: boolean;
  }> {
    // Validate PIN format (4 digits only)
    if (!/^\d{ 4 } $ /.test(pin)) {
      ErrorHelper.BadRequestException('PIN must be exactly 4 digits');
    }

    // Find user by ID with related entities
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['security', 'onboarding'],
    });

    if (!user) {
      ErrorHelper.NotFoundException('User not found');
    }

    // Check if user already has a PIN
    if (user.security?.pin) {
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

    // Create or update user security record with PIN
    if (user.security) {
      await this.userSecurityRepository.update(user.security.id, {
        pin: encryptedPin,
      });
    } else {
      const userSecurity = this.userSecurityRepository.create({
        userId,
        pin: encryptedPin,
      });
      await this.userSecurityRepository.save(userSecurity);
    }

    // Update onboarding step
    if (user.onboarding) {
      await this.userOnboardingRepository.update(user.onboarding.id, {
        currentStep: OnboardingStep.AUTHENTICATION_PIN,
        isCompleted: true,
        completedAt: new Date(),
        progressPercentage: 100,
      });
    }

    try {
      await this.userProgressService.addProgress(userId, UserProgressEvent.TRANSACTION_PIN_CREATED);
    } catch (err) {
      this.logger.error(`Failed to record PIN creation progress for user ${userId}: `, err);
    }

    return {
      message: 'PIN created successfully',
      success: true,
    };

  }

  // Password api
  async forgotPassword(email: string): Promise<{
    message: string;
    maskedPhone: string;
    expiryInMinutes: number;
  }> {
    // Find user by email with profile
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['profile'],
    });

    if (!user) {
      ErrorHelper.NotFoundException('User with this email not found');
    }

    if (!user.profile?.phone) {
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
    await this.sendOtpViaTermii(user.profile.phone, otpCode);

    // Return masked phone number
    const maskedPhone = this.maskPhoneNumber(user.profile.phone);

    return {
      message: 'OTP sent successfully to your phone number',
      maskedPhone,
      expiryInMinutes: 5,
    };
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
  }


  async updateUserProfile(
    userId: number,
    updateUserProfileDto: UpdateUserProfileDto,
  ): Promise<{ message: string; user: any }> {
    // Find user by ID with profile
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile'],
    });

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
    if (updateUserProfileDto.phone && updateUserProfileDto.phone !== user.profile?.phone) {
      const existingProfile = await this.userProfileRepository.findOne({
        where: { phone: updateUserProfileDto.phone },
      });

      if (existingProfile) {
        ErrorHelper.ConflictException('Phone number already in use by another user');
      }
    }

    // Update profile fields
    if (user.profile) {
      const profileUpdateData: any = {};

      if (updateUserProfileDto.firstName !== undefined) {
        profileUpdateData.firstName = updateUserProfileDto.firstName;
      }
      if (updateUserProfileDto.lastName !== undefined) {
        profileUpdateData.lastName = updateUserProfileDto.lastName;
      }
      if (updateUserProfileDto.phone !== undefined) {
        profileUpdateData.phone = updateUserProfileDto.phone;
        // Reset phone verification if phone is changed
        profileUpdateData.isPhoneVerified = false;
      }

      if (Object.keys(profileUpdateData).length > 0) {
        await this.userProfileRepository.update(user.profile.id, profileUpdateData);
      }
    }

    // Update user email if provided
    if (updateUserProfileDto.email !== undefined) {
      await this.userRepository.update(userId, {
        email: updateUserProfileDto.email,
        isEmailVerified: false, // Reset email verification if email is changed
      });
    }

    this.logger.log(`User profile updated successfully for user ${userId}`);

    return {
      message: 'User profile updated successfully',
      user: {
        id: user.id,
        email: updateUserProfileDto.email || user.email,
        firstName: updateUserProfileDto.firstName || user.profile?.firstName,
        lastName: updateUserProfileDto.lastName || user.profile?.lastName,
        phone: updateUserProfileDto.phone || user.profile?.phone,
      },
    };
  }


  async changePin(
    changePinDto: ChangePinDto,
  ): Promise<{ message: string; success: boolean }> {
    // Validate PIN format (4 digits only)
    if (!/^\d{ 4 } $ /.test(changePinDto.newPin)) {
      ErrorHelper.BadRequestException('New PIN must be exactly 4 digits');
    }

    if (changePinDto.newPin !== changePinDto.confirmPin) {
      ErrorHelper.BadRequestException('New PIN and confirm PIN do not match');
    }

    if (changePinDto.oldPin === changePinDto.newPin) {
      ErrorHelper.BadRequestException('New PIN must be different from old PIN');
    }

    // Find user by ID with security
    const user = await this.userRepository.findOne({
      where: { id: changePinDto.userId },
      relations: ['security'],
    });

    if (!user) {
      ErrorHelper.NotFoundException('User not found');
    }

    if (!user.security?.pin) {
      ErrorHelper.BadRequestException('User does not have a PIN set. Please create a PIN first.');
    }

    // Verify old PIN
    const isOldPinValid = CryptoUtil.verifyPin(changePinDto.oldPin, user.security.pin);
    if (!isOldPinValid) {
      ErrorHelper.UnauthorizedException('Invalid current PIN');
    }

    // Encrypt the new PIN
    const encryptedPin = CryptoUtil.encryptPin(changePinDto.newPin);

    // Update user security with new encrypted PIN
    await this.userSecurityRepository.update(user.security.id, {
      pin: encryptedPin,
    });

    this.logger.log(`PIN changed successfully for user ${changePinDto.userId}`);

    return {
      message: 'PIN changed successfully',
      success: true,
    };

  }

  async checkUser(
    identifier: string | number,
    identifierType: 'id' | 'email' | 'phone' = 'id',
  ): Promise<User> {
    let user: User | null = null;

    if (identifierType === 'id') {
      user = await this.userRepository.findOne({
        where: { id: Number(identifier) },
      });
    } else if (identifierType === 'email') {
      user = await this.userRepository.findOne({
        where: { email: identifier as string },
      });
    } else if (identifierType === 'phone') {
      // Find by phone in profile
      const userProfile = await this.userProfileRepository.findOne({
        where: { phone: identifier as string },
      });

      if (userProfile) {
        user = await this.userRepository.findOne({
          where: { id: userProfile.userId },
        });
      }
    } else {
      ErrorHelper.BadRequestException(`Invalid identifier type: ${identifierType} `);
    }

    if (!user) {
      ErrorHelper.NotFoundException(
        `User not found with ${identifierType}: ${identifier} `,
      );
    }

    return user;

  }

  async loginWithPin(phone: string, pin: string): Promise<LoginResponseDto> {
    if (!phone || !pin) {
      ErrorHelper.BadRequestException('Phone and PIN are required');
    }

    // Find user profile by phone, then load user with relations
    const userProfile = await this.userProfileRepository.findOne({
      where: { phone },
    });

    if (!userProfile) {
      ErrorHelper.UnauthorizedException('Invalid credentials');
    }

    const user = await this.userRepository.findOne({
      where: { id: userProfile.userId },
      relations: ['role', 'profile', 'security', 'onboarding'],
    });

    if (!user) {
      ErrorHelper.UnauthorizedException('Invalid credentials');
    }

    // Check user status
    if (user.status !== UserStatus.ACTIVE) {
      ErrorHelper.UnauthorizedException('Account is not active. Contact support.');
    }

    if (!user.security?.pin) {
      ErrorHelper.UnauthorizedException('Invalid credentials');
    }

    if (user.security.pinLockedUntil && user.security.pinLockedUntil > new Date()) {
      const remainingMs = user.security.pinLockedUntil.getTime() - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
      ErrorHelper.UnauthorizedException(
        `Account locked due to too many failed PIN attempts.Try again in ${remainingMinutes} minute(s).`,
      );
    }

    const isPinValid = CryptoUtil.verifyPin(pin, user.security.pin);
    if (!isPinValid) {
      const newAttempts = (user.security.pinFailedAttempts || 0) + 1;
      const securityUpdates: any = { pinFailedAttempts: newAttempts };

      if (newAttempts >= this.MAX_PIN_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + this.PIN_LOCK_MINUTES * 60 * 1000);
        securityUpdates.pinLockedUntil = lockUntil;
      }

      await this.userSecurityRepository.update(user.security.id, securityUpdates);
      ErrorHelper.UnauthorizedException('Invalid credentials');
    }

    if (user.security.pinFailedAttempts && user.security.pinFailedAttempts > 0) {
      await this.userSecurityRepository.update(user.security.id, {
        pinFailedAttempts: 0,
      });
    }

    const payload = {
      sub: user.id,
      email: user.email,
      firstName: user.profile?.firstName || '',
      lastName: user.profile?.lastName || '',
      deviceId: user.security?.deviceId,
      userType: user.userType,
      role: user.role?.userType,
      permissions: user.role?.permissions || [],

    };


    const accessToken = this.jwtService.sign(payload);

    return {
      message: 'User logged in successfully',
      accessToken,
      tokenType: 'Bearer',
      expiresIn: EXPIRATION_TIME_SECONDS,
      userId: user.id,
      email: user.email,
      firstName: user.profile?.firstName || '',
      lastName: user.profile?.lastName || '',
      phone: user.profile?.phone || '',
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.profile?.isPhoneVerified || false,
      onboardingStep: user.onboarding?.currentStep || OnboardingStep.PERSONAL_INFORMATION,
    };
  }

  async suspendUser(
    userId: number,
    suspendDto: SuspendUserDto,
    suspendedBy: number,
  ): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      ErrorHelper.NotFoundException('User not found');
    }

    if (user.userType === UserType.ADMIN) {
      // Check if the person suspending has higher privileges
      const suspendingUser = await this.userRepository.findOne({
        where: { id: suspendedBy },
        relations: ['role'],
      });

      if (!suspendingUser || suspendingUser.role?.name !== 'Super Admin') {
        ErrorHelper.ForbiddenException('Only Super Admin can suspend administrative users');
      }
    }

    user.status = UserStatus.SUSPENDED;
    user.statusReason = suspendDto.reason;
    user.suspendedBy = suspendedBy;

    if (suspendDto.suspendedUntil) {
      user.suspendedUntil = new Date(suspendDto.suspendedUntil);
    }

    const updatedUser = await this.userRepository.save(user);
    this.logger.log(`User ${userId} suspended by user ${suspendedBy} `);

    return updatedUser;
  }

  async reactivateUser(userId: number, reactivatedBy: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      ErrorHelper.NotFoundException('User not found');
    }

    user.status = UserStatus.ACTIVE;
    user.statusReason = 'Account reactivated';
    user.suspendedUntil = null;
    user.suspendedBy = undefined;

    const updatedUser = await this.userRepository.save(user);
    this.logger.log(`User ${userId} reactivated by user ${reactivatedBy} `);

    return updatedUser;
  }

  async changeUserStatus(
    userId: number,
    changeStatusDto: ChangeUserStatusDto,
    changedBy: number,
  ): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      ErrorHelper.NotFoundException('User not found');
    }

    // Check permissions for administrative users
    if (user.userType === UserType.ADMIN) {
      const changingUser = await this.userRepository.findOne({
        where: { id: changedBy },
        relations: ['role'],
      });

      if (!changingUser || changingUser.role?.name !== 'Super Admin') {
        ErrorHelper.ForbiddenException('Only Super Admin can change status of administrative users');
      }
    }

    user.status = changeStatusDto.status;

    if (changeStatusDto.reason) {
      user.statusReason = changeStatusDto.reason;
    }

    // Clear suspension fields if status is not suspended
    if (changeStatusDto.status !== UserStatus.SUSPENDED) {
      user.suspendedUntil = null;
      user.suspendedBy = undefined;
    }

    const updatedUser = await this.userRepository.save(user);
    this.logger.log(`User ${userId} status changed to ${changeStatusDto.status} by user ${changedBy} `);

    return updatedUser;
  }

  async assignRole(
    userId: number,
    roleId: number,
    assignedBy: number,
  ): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      ErrorHelper.NotFoundException('User not found');
    }

    const role = await this.roleRepository.findOne({ where: { id: roleId } });

    if (!role) {
      ErrorHelper.NotFoundException('Role not found');
    }

    if (role.status !== RoleStatus.ACTIVE) {
      ErrorHelper.BadRequestException('Cannot assign an inactive or suspended role');
    }

    // Check if role type matches user type
    if (user.userType !== role.userType) {
      ErrorHelper.BadRequestException(
        `Cannot assign ${role.userType} role to ${user.userType} user`,
      );
    }

    user.roleId = roleId;

    const updatedUser = await this.userRepository.save(user);
    this.logger.log(`Role ${roleId} assigned to user ${userId} by user ${assignedBy} `);

    return updatedUser;
  }

  async getAllUsers(
    pageOptionsDto: PaginationDto,
    userTypes?: UserType[],
    statuses?: UserStatus[],
    roleId?: number,
  ): Promise<PaginationResultDto<MappedUser>> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('user.business', 'business')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('user.kyc', 'kyc')
      .leftJoinAndSelect('user.security', 'security')
      .leftJoinAndSelect('user.onboarding', 'onboarding');

    if (userTypes?.length) {
      query.andWhere('user.userType IN (:...userTypes)', { userTypes });
    }

    if (statuses?.length) {
      query.andWhere('user.status IN (:...statuses)', { statuses });
    }

    if (roleId !== undefined) {
      query.andWhere('user.roleId = :roleId', { roleId });
    }

    query
      .orderBy('user.createdAt', pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.limit);

    const [users, itemCount] = await query.getManyAndCount();

    // Map users to frontend-compatible format
    const mappedUsers = UserMapper.toMappedUsers(users);

    return new PaginationResultDto(mappedUsers, {
      itemCount,
      pageOptionsDto,
    });
  }



  async getAdminUsers(
    pageOptionsDto: PaginationDto,
  ): Promise<PaginationResultDto<MappedUser>> {
    return this.getAllUsers(
      pageOptionsDto,
      [UserType.ADMIN, UserType.SUPER_ADMIN],
    );
  }

  async getMerchantUsers(
    pageOptionsDto: PaginationDto,
  ): Promise<PaginationResultDto<MappedUser>> {
    return this.getAllUsers(
      pageOptionsDto,
      [UserType.USER],
    );
  }

  async getActiveAdmins(
    pageOptionsDto: PaginationDto,
  ): Promise<PaginationResultDto<MappedUser>> {
    return this.getAllUsers(
      pageOptionsDto,
      [UserType.ADMIN],
      [UserStatus.ACTIVE],
    );
  }


  async getInactiveAdmins(
    pageOptionsDto: PaginationDto,
  ): Promise<PaginationResultDto<MappedUser>> {
    return this.getAllUsers(
      pageOptionsDto,
      [UserType.ADMIN],
      [
        UserStatus.INACTIVE,
        UserStatus.SUSPENDED,
        UserStatus.BANNED,
      ],
    );
  }


  private async sendOtpViaTermii(phoneNumber: string, otp: string): Promise<void> {
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

    const message = `Your Qkly OTP is: ${otp}. This code expires in 5 minutes.Do not share this code with anyone.`;

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
      this.httpService.post(`${termiiBaseUrl} /api/sms / send`, payload, {
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

    return `${firstPart}${maskedMiddle}${lastPart} `;
  }
}