import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
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
import { PaginationMetadataDto } from '../../common/queries/dto';
import { DateFilterUtil } from '../../common/utils/date-filter.util';
import { SubaccountStatusEnum } from '../admin/enums/admin-filter.enum';
import { MerchantFilterDto } from './dto/merchant-filter.dto';
import { MerchantStatsDto } from './dto/merchant-stats.dto';
import { MerchantsListResponseDto } from './dto/merchants-list-response.dto';

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
      relations: ['businessType', 'user', 'trafficEvents'],
    });
    if (!business) {
      ErrorHelper.NotFoundException(`Business with ID ${id} not found`);
    }
    return business;
  }

  async findBusinessByUserId(userId: number): Promise<Business | null> {
    return await this.businessRepository.findOne({
      where: { userId },
      relations: ['businessType', 'user', 'trafficEvents'],
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

      return await this.findBusinessById(saved.id);
    } catch (error) {
      if (error.code === '23505') { // Postgres unique violation
        ErrorHelper.BadRequestException('Store name or slug already exists');
      }
      if (error instanceof NotFoundException) throw error;
      ErrorHelper.InternalServerErrorException('Failed to update business');
    }
  }

  async getBusinessByStoreName(storeName: string): Promise<Business> {
    const business = await this.businessRepository.findOne({
      where: { storeName },
      relations: ['businessType', 'user', 'trafficEvents'],
    });
    if (!business) {
      ErrorHelper.NotFoundException(`Business with store name "${storeName}" not found`);
    }
    return business;
  }


  async getBusinessBySlug(slug: string): Promise<Business> {
    const business = await this.businessRepository.findOne({
      where: { slug },
      relations: ['businessType', 'user', 'trafficEvents'],
    });
    if (!business) throw new NotFoundException(`Business with slug "${slug}" not found`);
    return business;
  }


  async storeNameExists(storeName: string): Promise<boolean> {
    const count = await this.businessRepository.count({ where: { storeName } });
    return count > 0;
  }


  // ADMIN USE ONLY

  async getMerchantsList(
    filterDto: MerchantFilterDto,
  ): Promise<MerchantsListResponseDto> {
    const { skip, limit, order } = filterDto;

    // Build the query
    let queryBuilder = this.businessRepository
      .createQueryBuilder('business')
      .leftJoinAndSelect('business.user', 'user')
      .leftJoinAndSelect('business.businessType', 'businessType')
      .leftJoin('orders', 'order', 'order.businessId = business.id')
      .leftJoin('products', 'product', 'product.businessId = business.id')
      .leftJoin('transactions', 'transaction', 'transaction.businessId = business.id')
      .select([
        'business.id',
        'business.businessName',
        'business.storeName',
        'business.slug',
        'business.location',
        'business.isSubaccountActive',
        'business.revenueSharePercentage',
        'business.createdAt',
        'business.updatedAt',
        'user.email',
        'businessType.name',
      ])
      .addSelect('COUNT(DISTINCT order.id)', 'totalOrders')
      .addSelect('COALESCE(SUM(order.total), 0)', 'totalSalesVolume')
      .addSelect('COUNT(DISTINCT product.id)', 'totalProducts')
      .addSelect('COUNT(DISTINCT transaction.id)', 'totalTransactions');

    // Apply filters
    queryBuilder = this.applyFilters(queryBuilder, filterDto);

    // Group by
    queryBuilder = queryBuilder
      .groupBy('business.id')
      .addGroupBy('user.id')
      .addGroupBy('businessType.id');

    // Get count query before applying pagination
    const countQueryBuilder = this.businessRepository
      .createQueryBuilder('business')
      .leftJoin('business.user', 'user')
      .leftJoin('business.businessType', 'businessType');

    // Apply same filters to count query
    const countQuery = this.applyFilters(countQueryBuilder, filterDto);

    // Execute queries
    const [merchants, totalCount] = await Promise.all([
      queryBuilder.orderBy('business.createdAt', order).skip(skip).take(limit).getRawAndEntities(),
      countQuery.getCount(),
    ]);

    // Map results to DTOs
    const merchantsData: MerchantStatsDto[] = merchants.entities.map((business, index) => {
      const raw = merchants.raw[index];
      return {
        id: business.id,
        businessName: business.businessName,
        storeName: business.storeName,
        slug: business.slug,
        ownerEmail: business.user?.email || 'N/A',
        businessType: business.businessType?.name || 'N/A',
        location: business.location,
        totalOrders: parseInt(raw.totalOrders) || 0,
        totalSalesVolume: parseFloat(raw.totalSalesVolume).toFixed(2),
        totalProducts: parseInt(raw.totalProducts) || 0,
        totalTransactions: parseInt(raw.totalTransactions) || 0,
        isSubaccountActive: business.isSubaccountActive,
        revenueSharePercentage: business.revenueSharePercentage.toString(),
        dateRegistered: business.createdAt,
        lastUpdated: business.updatedAt,
      };
    });

    const meta = new PaginationMetadataDto({
      pageOptionsDto: filterDto,
      itemCount: totalCount,
    });

    return {
      data: merchantsData,
      meta,
    };
  }

  private applyFilters(
    queryBuilder: SelectQueryBuilder<Business>,
    filterDto: MerchantFilterDto,
  ): SelectQueryBuilder<Business> {
    const {
      search,
      businessTypeId,
      dateFilter,
      customStartDate,
      customEndDate,
      subaccountStatus,
      location,
      minRevenueShare,
      maxRevenueShare,
    } = filterDto;

    // Search filter (name, store name, or email)
    if (search) {
      queryBuilder.andWhere(
        '(business.businessName ILIKE :search OR business.storeName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Business type filter
    if (businessTypeId) {
      queryBuilder.andWhere('business.businessTypeId = :businessTypeId', { businessTypeId });
    }

    // Date filter
    if (dateFilter) {
      const dateRange = DateFilterUtil.getDateRange(
        dateFilter,
        customStartDate ? new Date(customStartDate) : undefined,
        customEndDate ? new Date(customEndDate) : undefined,
      );

      queryBuilder.andWhere('business.createdAt BETWEEN :startDate AND :endDate', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
    }

    // Subaccount status filter
    if (subaccountStatus) {
      const isActive = subaccountStatus === SubaccountStatusEnum.ACTIVE;
      queryBuilder.andWhere('business.isSubaccountActive = :isActive', { isActive });
    }

    // Location filter
    if (location) {
      queryBuilder.andWhere('business.location ILIKE :location', { location: `%${location}%` });
    }

    // Revenue share filter
    if (minRevenueShare !== undefined) {
      queryBuilder.andWhere('business.revenueSharePercentage >= :minRevenueShare', {
        minRevenueShare,
      });
    }

    if (maxRevenueShare !== undefined) {
      queryBuilder.andWhere('business.revenueSharePercentage <= :maxRevenueShare', {
        maxRevenueShare,
      });
    }

    return queryBuilder;
  }

}