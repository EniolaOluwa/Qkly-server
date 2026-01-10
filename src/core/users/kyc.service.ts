import { Injectable, Logger, BadRequestException, NotFoundException, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { User } from './entity/user.entity';
import { UserKYC } from './entities/user-kyc.entity';
import { UserOnboarding } from './entities/user-onboarding.entity';
import { WalletProvisioningUtil } from '../../common/utils/wallet-provisioning.util';
import { ErrorHelper } from '../../common/utils/error.utils';
import { OnboardingStep, KYCStatus, KYCProvider, KYCTier } from '../../common/enums/user.enum';
import { KycVerificationResponseDto } from '../../common/dto/responses.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserKYC)
    private userKycRepository: Repository<UserKYC>,
    @InjectRepository(UserOnboarding)
    private userOnboardingRepository: Repository<UserOnboarding>,
    private httpService: HttpService,
    private configService: ConfigService,
    private walletProvisioningUtil: WalletProvisioningUtil,
    private cloudinaryService: CloudinaryService,
    private notificationService: NotificationService,
  ) { }

  /**
   * Check if onboarding step should be updated
   * During onboarding: enforces strict sequence
   * After onboarding: always returns true (allow independent updates)
   */
  private async shouldUpdateStep(
    userId: number,
    current: OnboardingStep,
    next: OnboardingStep,
  ): Promise<boolean> {
    const ONBOARDING_ORDER = [
      OnboardingStep.PERSONAL_INFORMATION,
      OnboardingStep.PHONE_VERIFICATION,
      OnboardingStep.BUSINESS_INFORMATION,
      OnboardingStep.KYC_VERIFICATION,
      OnboardingStep.AUTHENTICATION_PIN,
    ];

    // Check if onboarding is complete
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['onboarding'],
    });

    // If onboarding is complete, allow any updates
    if (user?.onboarding?.isCompleted) {
      return true;
    }

    // During onboarding, enforce strict sequence
    const currentIndex = ONBOARDING_ORDER.indexOf(current);
    const nextIndex = ONBOARDING_ORDER.indexOf(next);
    return nextIndex === currentIndex + 1;
  }

  async verifyBvnWithSelfie(
    userId: number,
    bvn: string,
    selfieImageFile: Express.Multer.File,
  ): Promise<KycVerificationResponseDto> {
    try {
      // Get Dojah API configuration
      const dojahBaseUrl = this.configService.get<string>('DOJAH_BASE_URL', 'https://api.dojah.io');
      const dojahAppId = this.configService.get<string>('DOJAH_APP_ID');
      const dojahPublicKey = this.configService.get<string>('DOJAH_PUBLIC_KEY');

      if (!dojahAppId || !dojahPublicKey) {
        ErrorHelper.InternalServerErrorException('Dojah API credentials not configured');
      }

      // Find user by ID with KYC and onboarding
      // Find user by ID with KYC and onboarding
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['kyc', 'onboarding', 'profile'],
      });
      if (!user) {
        ErrorHelper.NotFoundException('User not found');
      }

      // ... existing validation code ...

      /* Note: skipping re-writing strict file validation lines in this tool call for brevity unless needed. 
         Assuming the replace works on the block of interest properly. 
         Actually, I need to match precise context. The user fetch is at the top. The notification is at the bottom.
         I will do two separate replacements or one big one if contiguous? They are far apart.
         I'll do the user fetch first.
      */
      if (!user) {
        ErrorHelper.NotFoundException('User not found');
      }

      // Validate file type and size
      if (!selfieImageFile) {
        ErrorHelper.BadRequestException('Selfie image file is required');
      }

      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedMimeTypes.includes(selfieImageFile.mimetype)) {
        ErrorHelper.BadRequestException('Invalid file type. Only JPEG and PNG images are supported.');
      }

      const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
      if (selfieImageFile.size > maxSizeInBytes) {
        ErrorHelper.BadRequestException('File size too large. Maximum size allowed is 5MB.');
      }

      const base64Image = selfieImageFile.buffer.toString('base64');
      const formattedSelfieImage = base64Image;

      // Validate that the base64 string starts with expected JPEG signature
      if (!formattedSelfieImage.startsWith('/9') && selfieImageFile.mimetype !== 'image/png') {
        // Note: PNGs start differently, simpler check here
        // This check might be too strict if we allow PNGs which start with iVBORw0KGgo
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

      const selfieVerification = verificationData.selfie_verification;
      const isVerified = selfieVerification?.match === true;

      if (isVerified) {
        // Success - Upgrade to Tier 2
        const updateData: Partial<UserKYC> = {
          bvn: bvn,
          status: KYCStatus.VERIFIED,
          verificationProvider: KYCProvider.DOJAH,
          verificationResponse: verificationData,
          verifiedAt: new Date(),
          tier: KYCTier.TIER_2, // Upgrade to Tier 2
        };

        if (user.kyc) {
          await this.userKycRepository.update(user.kyc.id, updateData);
        } else {
          const userKyc = this.userKycRepository.create({
            userId,
            ...updateData,
          });
          await this.userKycRepository.save(userKyc);
        }

        // Update onboarding step
        if (user.onboarding) {
          // If onboarding is not complete, validate prerequisites
          if (!user.onboarding.isCompleted) {
            // Ensure user has completed business information before KYC
            if (user.onboarding.currentStep !== OnboardingStep.BUSINESS_INFORMATION) {
              ErrorHelper.BadRequestException(
                'Please complete business information before KYC verification'
              );
            }
          }

          const nextStep = OnboardingStep.KYC_VERIFICATION;
          if (await this.shouldUpdateStep(userId, user.onboarding.currentStep, nextStep)) {
            await this.userOnboardingRepository.update(user.onboarding.id, {
              currentStep: nextStep,
            });
          }
        }

        // Try to provision wallet
        try {
          const bvnVerificationData = {
            bvn: verificationData.bvn,
            customerName: `${verificationData.first_name} ${verificationData.last_name}`.trim(),
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
            this.logger.log(`Wallet provisioned successfully for user ${userId}`);
          } else {
            this.logger.warn(`Failed to provision wallet for user ${userId}: ${walletResult.error}`);
          }
        } catch (walletError) {
          this.logger.error('Wallet provisioning failed:', walletError);
        }

        await this.notificationService.sendKycApprovedNotification(
          user.email,
          user.profile?.firstName || 'User',
          'Tier 2 (BVN Verified)'
        );
      }

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
      this.logger.error('Dojah BVN verification failed:', error.response?.data || error.message);

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      if (error.response?.status === 401) {
        ErrorHelper.UnauthorizedException('Invalid Dojah API credentials');
      }
      if (error.response?.status === 403) {
        ErrorHelper.UnauthorizedException('Insufficient permissions for Dojah API');
      }
      ErrorHelper.InternalServerErrorException('Failed to verify BVN with selfie');
    }
  }

  // Placeholder for upgrading to Tier 3
  async upgradeToTier3(userId: number, idType: string, idNumber: string, idImageFile: Express.Multer.File) {
    const user = await this.userRepository.findOne({ where: { id: userId }, relations: ['kyc', 'profile'] });
    if (!user) ErrorHelper.NotFoundException('User not found');

    // Create KYC record if not exists
    let userKycId = user.kyc?.id;
    if (!userKycId) {
      const newKyc = this.userKycRepository.create({ userId, status: KYCStatus.PENDING });
      const savedKyc = await this.userKycRepository.save(newKyc);
      userKycId = savedKyc.id;
    }

    let idImageUrl: string | undefined = undefined;
    if (idImageFile) {
      try {
        const uploadResult = await this.cloudinaryService.uploadImage(idImageFile);
        idImageUrl = uploadResult.url;
      } catch (error) {
        this.logger.error('Failed to upload ID image', error);
        ErrorHelper.InternalServerErrorException('Failed to upload ID image');
      }
    }

    await this.userKycRepository.update(userKycId, {
      idType,
      idNumber,
      idImageUrl: idImageUrl,
      // We don't automatically approve Tier 3, it requires manual review
      // tier: KYCTier.TIER_3 
    });

    await this.notificationService.sendKycUnderReviewNotification(
      user.email,
      user.profile?.firstName || 'User'
    );

    return { message: 'ID Document submitted for review' };
  }
}
