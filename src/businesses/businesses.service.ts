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
import {
  CreateBusinessTypeDto,
  UpdateBusinessTypeDto,
  CreateBusinessDto,
  UpdateBusinessDto,
} from '../dto/responses.dto';
import { CloudinaryUtil } from '../utils/cloudinary.util';

@Injectable()
export class BusinessesService {
  constructor(
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(BusinessType)
    private businessTypeRepository: Repository<BusinessType>,
    private cloudinaryUtil: CloudinaryUtil,
  ) {}

  // Business Type methods
  async createBusinessType(
    createBusinessTypeDto: CreateBusinessTypeDto,
  ): Promise<BusinessType> {
    try {
      // Check if business type already exists
      const existingBusinessType = await this.businessTypeRepository.findOne({
        where: { name: createBusinessTypeDto.name },
      });

      if (existingBusinessType) {
        throw new ConflictException(
          'Business type with this name already exists',
        );
      }

      // Create new business type
      const businessType = this.businessTypeRepository.create({
        name: createBusinessTypeDto.name,
      });

      // Save business type to database
      return await this.businessTypeRepository.save(businessType);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create business type');
    }
  }

  async findAllBusinessTypes(): Promise<BusinessType[]> {
    return await this.businessTypeRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findBusinessTypeById(id: number): Promise<BusinessType> {
    const businessType = await this.businessTypeRepository.findOne({
      where: { id },
    });
    if (!businessType) {
      throw new NotFoundException(`Business type with ID ${id} not found`);
    }
    return businessType;
  }

  async updateBusinessType(
    id: number,
    updateBusinessTypeDto: UpdateBusinessTypeDto,
  ): Promise<BusinessType> {
    try {
      const businessType = await this.findBusinessTypeById(id);

      // Check if the new name conflicts with existing business types
      if (
        updateBusinessTypeDto.name &&
        updateBusinessTypeDto.name !== businessType.name
      ) {
        const existingBusinessType = await this.businessTypeRepository.findOne({
          where: { name: updateBusinessTypeDto.name },
        });

        if (existingBusinessType) {
          throw new ConflictException(
            'Business type with this name already exists',
          );
        }
      }

      // Update the business type
      Object.assign(businessType, updateBusinessTypeDto);
      return await this.businessTypeRepository.save(businessType);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update business type');
    }
  }

  async deleteBusinessType(id: number): Promise<void> {
    const businessType = await this.findBusinessTypeById(id);
    await this.businessTypeRepository.remove(businessType);
  }

  // Business methods
  async createBusiness(
    createBusinessDto: CreateBusinessDto,
  ): Promise<Business> {
    try {
      // Verify business type exists
      await this.findBusinessTypeById(createBusinessDto.businessTypeId);

      // Upload logo to Cloudinary (logo is required but validated in controller)
      if (!createBusinessDto.logo) {
        throw new Error('Logo is required for business creation');
      }
      
      const uploadResult = await this.cloudinaryUtil.uploadImage(
        createBusinessDto.logo.buffer,
      );
      const logoUrl = uploadResult.secure_url;

      // Create new business
      const business = this.businessRepository.create({
        businessName: createBusinessDto.businessName,
        businessTypeId: createBusinessDto.businessTypeId,
        businessDescription: createBusinessDto.businessDescription,
        location: createBusinessDto.location,
        logo: logoUrl,
      });

      // Save business to database
      const savedBusiness = await this.businessRepository.save(business);

      // Return business with relations loaded
      return await this.findBusinessById(savedBusiness.id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create business');
    }
  }

  async findAllBusinesses(): Promise<Business[]> {
    return await this.businessRepository.find({
      relations: ['businessType'],
      order: { businessName: 'ASC' },
    });
  }

  async findBusinessById(id: number): Promise<Business> {
    const business = await this.businessRepository.findOne({
      where: { id },
      relations: ['businessType'],
    });
    if (!business) {
      throw new NotFoundException(`Business with ID ${id} not found`);
    }
    return business;
  }

  async updateBusiness(
    id: number,
    updateBusinessDto: UpdateBusinessDto,
  ): Promise<Business> {
    try {
      const business = await this.findBusinessById(id);

      // Verify business type exists if provided
      if (updateBusinessDto.businessTypeId) {
        await this.findBusinessTypeById(updateBusinessDto.businessTypeId);
        business.businessTypeId = updateBusinessDto.businessTypeId;
      }

      // Handle logo update
      if (updateBusinessDto.logo) {
        // Delete old logo if it exists
        if (business.logo) {
          try {
            // Extract public_id from the Cloudinary URL
            const urlParts = business.logo.split('/');
            const publicIdWithExtension = urlParts[urlParts.length - 1];
            const publicId = `Qkly/business-logo/${publicIdWithExtension.split('.')[0]}`;
            await this.cloudinaryUtil.deleteImage(publicId);
          } catch (deleteError) {
            console.warn('Could not delete old logo:', deleteError);
            // Continue with upload even if deletion fails
          }
        }

        // Upload new logo
        const uploadResult = await this.cloudinaryUtil.uploadImage(
          updateBusinessDto.logo.buffer,
        );
        business.logo = uploadResult.secure_url;
      }

      // Update other fields
      if (updateBusinessDto.businessName)
        business.businessName = updateBusinessDto.businessName;
      if (updateBusinessDto.businessDescription)
        business.businessDescription = updateBusinessDto.businessDescription;
      if (updateBusinessDto.location)
        business.location = updateBusinessDto.location;

      await this.businessRepository.save(business);

      // Return updated business with relations loaded
      return await this.findBusinessById(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update business');
    }
  }

  async deleteBusiness(id: number): Promise<void> {
    const business = await this.findBusinessById(id);
    await this.businessRepository.remove(business);
  }
}
