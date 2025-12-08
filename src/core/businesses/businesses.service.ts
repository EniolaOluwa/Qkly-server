import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from './business.entity';
import { BusinessType } from './business-type.entity';
import { User } from '../users/entity/user.entity';
import { OnboardingStep } from '../users/dto/onboarding-step.enum';
import {
  CreateBusinessTypeDto,
  UpdateBusinessTypeDto,
  CreateBusinessDto,
  UpdateBusinessDto,
} from '../../common/dto/responses.dto';
import { CloudinaryUtil } from '../../common/utils/cloudinary.util';
import { ErrorHelper } from '../../common/utils';
import { UserProgressEvent } from '../user-progress/entities/user-progress.entity';
import { UserProgressService } from '../user-progress/user-progress.service';






@Injectable()
export class BusinessesService {
  constructor(
    private readonly userProgressService: UserProgressService,
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(BusinessType)
    private businessTypeRepository: Repository<BusinessType>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private cloudinaryUtil: CloudinaryUtil,
  ) { }

  // ==================== BUSINESS TYPE METHODS ====================

  async createBusinessType(
    createBusinessTypeDto: CreateBusinessTypeDto,
  ): Promise<BusinessType> {
    try {
      const existingBusinessType = await this.businessTypeRepository.findOne({
        where: { name: createBusinessTypeDto.name },
      });

      if (existingBusinessType) {
        ErrorHelper.ConflictException(
          'Business type with this name already exists',
        );
      }

      const businessType = this.businessTypeRepository.create({
        name: createBusinessTypeDto.name,
      });

      return await this.businessTypeRepository.save(businessType);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      ErrorHelper.InternalServerErrorException('Failed to create business type');
    }
  }

  async findAllBusinessTypes(): Promise<BusinessType[]> {
    return this.businessTypeRepository.find({
      select: ['id', 'name', 'createdAt', 'updatedAt'],
      order: { name: 'ASC' },
    });
  }

  async findBusinessTypeById(id: number): Promise<BusinessType> {
    const businessType = await this.businessTypeRepository.findOne({
      where: { id },
    });
    if (!businessType) {
      ErrorHelper.NotFoundException(`Business type with ID ${id} not found`);
    }
    return businessType;
  }

  async updateBusinessType(
    id: number,
    updateBusinessTypeDto: UpdateBusinessTypeDto,
  ): Promise<BusinessType> {
    try {
      const businessType = await this.findBusinessTypeById(id);

      if (
        updateBusinessTypeDto.name &&
        updateBusinessTypeDto.name !== businessType.name
      ) {
        const existingBusinessType = await this.businessTypeRepository.findOne({
          where: { name: updateBusinessTypeDto.name },
        });

        if (existingBusinessType) {
          ErrorHelper.ConflictException(
            'Business type with this name already exists',
          );
        }
      }

      Object.assign(businessType, updateBusinessTypeDto);
      return await this.businessTypeRepository.save(businessType);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      ErrorHelper.InternalServerErrorException('Failed to update business type');
    }
  }

  async deleteBusinessType(id: number): Promise<void> {
    const businessType = await this.findBusinessTypeById(id);
    await this.businessTypeRepository.remove(businessType);
  }

  // ==================== BUSINESS METHODS ====================

  async createBusiness(
    createBusinessDto: CreateBusinessDto,
    userId: number,
  ): Promise<Business> {
    try {
      const existingBusiness = await this.businessRepository.findOne({
        where: { userId },
      });

      if (existingBusiness) {
        ErrorHelper.ConflictException(
          'User already has a business. Only one business per user is allowed',
        );
      }

      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        ErrorHelper.NotFoundException('User not found');
      }

      if (user.onboardingStep !== OnboardingStep.PHONE_VERIFICATION) {
        ErrorHelper.ConflictException(
          `User must have completed phone verification before creating a business. Current step: ${user.onboardingStep}`,
        );
      }

      await this.findBusinessTypeById(createBusinessDto.businessTypeId);

      if (!createBusinessDto.logo) {
        ErrorHelper.BadRequestException('Logo is required for business creation');
      }


      const uploadImage = async (file: Express.Multer.File): Promise<string> => {
        const uploaded = await this.cloudinaryUtil.uploadImage(file.buffer);
        return uploaded.secure_url;
      };

      // upload logo
      const logoUrl = await uploadImage(createBusinessDto.logo);


      const business = this.businessRepository.create({
        businessName: createBusinessDto.businessName,
        businessTypeId: createBusinessDto.businessTypeId,
        businessDescription: createBusinessDto.businessDescription,
        location: createBusinessDto.location,
        logo: logoUrl,
        userId,
      });

      const savedBusiness = await this.businessRepository.save(business);

      await this.userRepository.update(userId, {
        onboardingStep: OnboardingStep.BUSINESS_INFORMATION,
        businessId: savedBusiness.id,
      });

      return await this.findBusinessById(savedBusiness.id);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      ErrorHelper.InternalServerErrorException('Failed to create business');
    }
  }

  async findAllBusinesses(): Promise<Business[]> {
    return await this.businessRepository.find({
      relations: ['businessType', 'user'],
      order: { businessName: 'ASC' },
    });
  }

  async findBusinessById(id: number): Promise<Business> {
    const business = await this.businessRepository.findOne({
      where: { id },
      relations: ['businessType', 'user'],
    });
    if (!business) {
      ErrorHelper.NotFoundException(`Business with ID ${id} not found`);
    }
    return business;
  }

  async findBusinessByUserId(userId: number): Promise<Business | null> {
    return await this.businessRepository.findOne({
      where: { userId },
      relations: ['businessType', 'user'],
    });
  }

  async deleteBusiness(id: number): Promise<void> {
    const business = await this.findBusinessById(id);
    await this.businessRepository.remove(business);
  }


  async updateBusinessDetails(
    updateBusiness: UpdateBusinessDto,
    userId: number,
    businessId: number,
  ): Promise<Business> {
    try {
      const business = await this.businessRepository.findOne({
        where: { userId, id: businessId },
        relations: ['businessType'],
      });

      if (!business) {
        ErrorHelper.NotFoundException('Business record not found');
      }

      // Store original data to detect changes
      const original = { ...business };

      // ===== Helper: upload + safely delete old image =====
      const handleImageUpdate = async (
        existing: string | null | undefined,
        file: Express.Multer.File,
        folder: string,
      ): Promise<string> => {
        try {
          if (existing) {
            const parts = existing.split('/');
            const fileName = parts.pop();
            if (fileName) {
              const publicId = `${folder}/${fileName.split('.')[0]}`;
              await this.cloudinaryUtil.deleteImage(publicId);
            }
          }
        } catch (err) {
          console.warn(`Could not delete old ${folder} image:`, err);
        }

        const uploaded = await this.cloudinaryUtil.uploadImage(file.buffer);
        return uploaded.secure_url;
      };

      // ===== Logo =====
      if (updateBusiness.logo) {
        business.logo = await handleImageUpdate(
          business.logo,
          updateBusiness.logo,
          'Qkly/business-logo',
        );
      }

      // ===== Cover image =====
      let coverImageFirstTime = false;

      if (updateBusiness.coverImage) {
        // FIRST-TIME update check
        if (!business.coverImage) {
          coverImageFirstTime = true;
        }

        business.coverImage = await handleImageUpdate(
          business.coverImage,
          updateBusiness.coverImage,
          'Qkly/business-cover',
        );
      }

      // ===== Standard fields =====
      const updatableFields: (keyof UpdateBusinessDto)[] = [
        'businessName',
        'businessDescription',
        'location',
        'storeName',
        'heroText',
        'storeColor',
      ];

      for (const field of updatableFields) {
        const value = updateBusiness[field];
        if (value !== undefined) {
          (business as any)[field] = value;
        }
      }

      // ===== Business type update =====
      if (updateBusiness.businessTypeId !== undefined) {
        await this.findBusinessTypeById(updateBusiness.businessTypeId);
        business.businessTypeId = updateBusiness.businessTypeId;
      }

      // Save updated business
      const saved = await this.businessRepository.save(business);

      // ===== Detect business info updated =====

      const fieldsToCheck = [
        'businessName',
        'businessDescription',
        'location',
        'storeName',
        'heroText',
        'storeColor',
        'businessTypeId',
        'logo',
        'coverImage',
      ];

      const infoChanged = fieldsToCheck.some(field => {
        return original[field] !== (saved as any)[field];
      });

      if (infoChanged) {
        await this.userProgressService.addProgressIfMissing(
          userId,
          UserProgressEvent.BUSINESS_INFO_UPDATED,
        );
      }

      // ===== Detect first-time cover image upload =====
      if (coverImageFirstTime) {
        await this.userProgressService.addProgressIfMissing(
          userId,
          UserProgressEvent.COVER_IMAGE_UPDATED,
        );
      }

      return await this.findBusinessById(saved.id);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      ErrorHelper.InternalServerErrorException('Failed to update business');
    }
  }

}