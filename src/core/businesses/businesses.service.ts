import {
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsRelations, Repository, SelectQueryBuilder } from 'typeorm';
import { UserType } from '../../common/auth/user-role.enum';
import {
  CreateBusinessDto,
  CreateBusinessTypeDto,
  UpdateBusinessDto,
  UpdateBusinessTypeDto,
} from '../../common/dto/responses.dto';
import { PaymentAccountStatus } from '../../common/enums/payment.enum';
import { PaginationMetadataDto, PaginationOrder } from '../../common/queries/dto';
import { ErrorHelper } from '../../common/utils';
import { CloudinaryUtil } from '../../common/utils/cloudinary.util';
import { DateFilterUtil } from '../../common/utils/date-filter.util';
import { SubaccountStatusEnum } from '../admin/enums/admin-filter.enum';
import { LeadForm } from '../lead/entity/leadForm.entity';
import { Role, RoleStatus } from '../roles/entities/role.entity';
import { UserProgressEvent } from '../user-progress/entities/user-progress.entity';
import { UserProgressService } from '../user-progress/user-progress.service';
import { User, UserStatus } from '../users/entity/user.entity';
import { UsersService } from '../users/users.service';
import { BusinessType } from './business-type.entity';
import { Business } from './business.entity';
import { MerchantFilterDto } from './dto/merchant-filter.dto';
import { MerchantStatsDto } from './dto/merchant-stats.dto';
import { MerchantsListResponseDto } from './dto/merchants-list-response.dto';
import { BusinessPaymentAccount } from './entities/business-payment-account.entity'; // Import

@Injectable()
export class BusinessesService {
  constructor(
    private readonly userProgressService: UserProgressService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @InjectRepository(Business)
    private businessRepo: Repository<Business>,
    @InjectRepository(BusinessType)
    private businessTypeRepo: Repository<BusinessType>,
    @InjectRepository(User)
    private userRepos: Repository<User>,
    @InjectRepository(Role)
    private roleRepo: Repository<Role>,
    @InjectRepository(BusinessPaymentAccount)
    private paymentAccountRepo: Repository<BusinessPaymentAccount>,
    private cloudinaryUtil: CloudinaryUtil,
  ) { }

  /**
   * Update or Create Subaccount Code for a Merchant
   */
  async updateSubaccountCode(userId: number, subaccountCode: string): Promise<void> {
    const business = await this.businessRepo.findOne({
      where: { userId },
      relations: ['paymentAccount']
    });

    if (!business) {
      // Not a business, maybe regular user.
      return;
    }

    let account = business.paymentAccount;
    if (!account) {
      account = new BusinessPaymentAccount();
      account.business = business;
      // Default values
      account.accountName = business.businessName;
      account.bankName = 'Paystack Subaccount';
      account.accountNumber = 'UNKNOWN'; // We don't have this here, but needed for entity validation potentially
      account.status = PaymentAccountStatus.ACTIVE;
    }

    account.providerSubaccountCode = subaccountCode;
    // Ensure status is active
    account.status = PaymentAccountStatus.ACTIVE;

    await this.paymentAccountRepo.save(account);
  }

  async getBusinessPaymentAccount(userId: number): Promise<BusinessPaymentAccount | null> {
    const business = await this.businessRepo.findOne({
      where: { userId },
      relations: ['paymentAccount']
    });
    return business?.paymentAccount || null;
  }

  private readonly logger = new Logger(BusinessesService.name);


  // ==================== BUSINESS TYPE METHODS ====================
  async createBusinessType(
    createBusinessTypeDto: CreateBusinessTypeDto,
  ): Promise<BusinessType> {
    const existingBusinessType = await this.businessTypeRepo.findOne({
      where: { name: createBusinessTypeDto.name },
    });

    if (existingBusinessType) {
      ErrorHelper.ConflictException(
        'Business type with this name already exists',
      );
    }

    const businessType = this.businessTypeRepo.create({
      name: createBusinessTypeDto.name,
    });

    return await this.businessTypeRepo.save(businessType);
  }

  async findAllBusinessTypes(): Promise<BusinessType[]> {
    return this.businessTypeRepo.find({
      select: ['id', 'name', 'createdAt', 'updatedAt'],
      order: { name: 'ASC' },
    });
  }

  async findBusinessTypeById(id: number): Promise<BusinessType> {
    const businessType = await this.businessTypeRepo.findOne({
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
        const existingBusinessType = await this.businessTypeRepo.findOne({
          where: { name: updateBusinessTypeDto.name },
        });

        if (existingBusinessType) {
          ErrorHelper.ConflictException(
            'Business type with this name already exists',
          );
        }
      }

      Object.assign(businessType, updateBusinessTypeDto);
      return await this.businessTypeRepo.save(businessType);
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
    await this.businessTypeRepo.remove(businessType);
  }

  // ==================== BUSINESS METHODS ====================
  async createBusiness(
    createBusinessDto: CreateBusinessDto,
    userId: number,
  ): Promise<Business> {
    // Validate all prerequisites are complete (phone, KYC, PIN)
    await this.usersService.validateBusinessPrerequisites(userId);

    // Find user
    const user = await this.userRepos.findOne({
      where: { id: userId },
      relations: ['role', 'onboarding', 'profile'],
    });

    if (!user) {
      ErrorHelper.NotFoundException('User not found');
    }

    if (!user.roleId || !user.role) {
      await this.assignMerchantRole(user);
      this.logger.log(`Auto-assigned Merchant role to user ${userId}`);
    }

    // Ensure user is of type USER
    if (user.userType !== UserType.USER) {
      user.userType = UserType.USER;
      await this.userRepos.save(user);
    }

    // Check if user already has a business
    if (user.businessId) {
      ErrorHelper.BadRequestException('User already has a business registered');
    }

    await this.findBusinessTypeById(createBusinessDto.businessTypeId);

    if (!createBusinessDto.logo) {
      ErrorHelper.BadRequestException('Logo is required for business creation');
    }

    // Check if store name already exists
    if (createBusinessDto.storeName) {
      const existingBusiness = await this.businessRepo.findOne({
        where: { storeName: createBusinessDto.storeName },
      });

      if (existingBusiness) {
        ErrorHelper.BadRequestException(
          `Store name "${createBusinessDto.storeName}" is already taken. Please choose a different name.`
        );
      }
    }

    const uploadImage = async (file: Express.Multer.File): Promise<string> => {
      const uploaded = await this.cloudinaryUtil.uploadImage(file.buffer);
      return uploaded.secure_url;
    };


    // upload logo
    const logoUrl = await uploadImage(createBusinessDto.logo);


    const business = this.businessRepo.create({
      ...createBusinessDto,
      businessName: createBusinessDto.businessName,
      businessTypeId: createBusinessDto.businessTypeId,
      businessDescription: createBusinessDto.businessDescription,
      location: createBusinessDto.location,
      logo: logoUrl,
      userId,
    });

    const savedBusiness = await this.businessRepo.save(business);

    // Update user's businessId
    await this.userRepos.update(userId, {
      businessId: savedBusiness.id,
    });

    // Mark onboarding as complete (business is the final step)
    await this.usersService.completeOnboarding(userId);

    return await this.findBusinessById(savedBusiness.id);
  }

  async findAllBusinesses(): Promise<Business[]> {
    return await this.businessRepo.find({
      relations: ['businessType', 'user'],
      order: { businessName: 'ASC' },
      take: 100, // Safety limit
    });
  }

  async findAllBusinessesPaginated(
    queryDto: { page: number; limit: number; order: PaginationOrder; search?: string; skip: number }
  ): Promise<{ data: Business[]; total: number }> {
    const queryBuilder = this.businessRepo.createQueryBuilder('business')
      .leftJoinAndSelect('business.businessType', 'businessType')
      .leftJoinAndSelect('business.user', 'user');

    if (queryDto.search) {
      queryBuilder.andWhere(
        '(business.businessName ILIKE :search OR business.storeName ILIKE :search)',
        { search: `%${queryDto.search}%` }
      );
    }

    queryBuilder
      .orderBy('business.createdAt', queryDto.order)
      .skip(queryDto.skip)
      .take(queryDto.limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }

  async findBusinessById(id: number): Promise<Business> {
    const business = await this.businessRepo.findOne({
      where: { id },
      relations: ['businessType', 'user', 'trafficEvents'],
    });
    if (!business) {
      ErrorHelper.NotFoundException(`Business with ID ${id} not found`);
    }
    return business;
  }

  async findBusinessByUserId(userId: number): Promise<Business | null> {
    return await this.businessRepo.findOne({
      where: { userId },
      relations: ['businessType', 'user', 'trafficEvents'],
    });
  }

  async deleteBusiness(id: number): Promise<void> {
    const business = await this.findBusinessById(id);
    await this.businessRepo.remove(business);
  }


  async updateBusinessDetails(
    updateBusiness: UpdateBusinessDto,
    userId: number,
    businessId: number,
  ): Promise<Business> {
    try {
      const business = await this.businessRepo.findOne({
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
      const saved = await this.businessRepo.save(business);

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
    const business = await this.businessRepo.findOne({
      where: { storeName },
      relations: ['businessType', 'user', 'trafficEvents'],
    });
    if (!business) {
      ErrorHelper.NotFoundException(`Business with store name "${storeName}" not found`);
    }
    return business;
  }


  async getBusinessBySlug(slug: string): Promise<Business> {
    const business = await this.businessRepo.findOne({
      where: { slug },
      relations: ['businessType', 'user', 'trafficEvents'],
    });
    if (!business) throw new NotFoundException(`Business with slug "${slug}" not found`);
    return business;
  }


  async storeNameExists(storeName: string): Promise<boolean> {
    const count = await this.businessRepo.count({ where: { storeName } });
    return count > 0;
  }

  async getFormsByBusinessIdentifier(
    identifier: number | string,
  ): Promise<LeadForm[]> {
    try {
      const where =
        typeof identifier === 'number'
          ? { id: identifier }
          : [
            { slug: identifier },
            { storeName: identifier },
          ];

      const business = await this.businessRepo.findOne({
        where,
        relations: ['forms'],
      });

      if (!business) {
        ErrorHelper.NotFoundException('Business not found');
      }

      return business.forms;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;

      ErrorHelper.InternalServerErrorException(
        `Error fetching business forms: ${error.message}`,
        error,
      );
    }
  }


  async resolveBusinessByIdentifier(
    identifier: number | string,
    relations?: FindOptionsRelations<Business>,
  ): Promise<Business> {
    const where =
      typeof identifier === 'number'
        ? { id: identifier }
        : [
          { slug: identifier },
          { storeName: identifier },
        ];

    const business = await this.businessRepo.findOne({
      where,
      relations,
    });

    if (!business) {
      ErrorHelper.NotFoundException('Business not found');
    }

    return business;
  }



  // ADMIN USE ONLY

  async getMerchantsList(
    filterDto: MerchantFilterDto,
  ): Promise<MerchantsListResponseDto> {
    const { skip, limit, order } = filterDto;

    // Build the query
    let queryBuilder = this.businessRepo
      .createQueryBuilder('business')
      .leftJoinAndSelect('business.user', 'user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('business.businessType', 'businessType')
      .leftJoinAndSelect('business.paymentAccount', 'paymentAccount')
      .leftJoin('orders', 'order', 'order.businessId = business.id')
      .leftJoin('products', 'product', 'product.businessId = business.id')
      .leftJoin('transactions', 'transaction', 'transaction.businessId = business.id')
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
      .addGroupBy('user.roleId') // Postgres strict group by
      .addGroupBy('role.id')
      .addGroupBy('businessType.id')
      .addGroupBy('paymentAccount.id');

    // Get count query before applying pagination
    const countQueryBuilder = this.businessRepo
      .createQueryBuilder('business')
      .leftJoin('business.user', 'user')
      .leftJoin('business.businessType', 'businessType')
      .leftJoin('business.paymentAccount', 'paymentAccount');

    // Apply same filters to count query
    const countQuery = this.applyFilters(countQueryBuilder, filterDto);

    // Execute queries
    const [merchants, totalCount] = await Promise.all([
      queryBuilder.orderBy('business.createdAt', order).skip(skip).take(limit).getRawAndEntities(),
      countQuery.getCount(),
    ]);

    // Map results to DTOs
    const merchantsData: MerchantStatsDto[] = merchants.entities.map((business, index) => {
      // Find the raw result for this entity (order matches because of same query)
      // Note: getRawAndEntities returns entities and raw results in same order
      // However, if we skip/take, we need to be careful. But typeorm usually aligns them.
      // To be safer, we can match by ID if needed, but index usually works if query is straightforward.
      // Actually, raw results from getRawAndEntities are flat.

      // Let's find the matching raw result by id to be robust
      const raw = merchants.raw.find(r => r.business_id === business.id);

      return {
        id: business.id,
        businessName: business.businessName,
        storeName: business.storeName,
        slug: business.slug,
        ownerEmail: business.user?.email || 'N/A',
        businessType: business.businessType?.name || 'N/A',
        location: business.location,
        totalOrders: raw ? parseInt(raw.totalOrders) : 0,
        totalSalesVolume: raw ? parseFloat(raw.totalSalesVolume).toFixed(2) : '0.00',
        totalProducts: raw ? parseInt(raw.totalProducts) : 0,
        totalTransactions: raw ? parseInt(raw.totalTransactions) : 0,
        isSubaccountActive: business.paymentAccount?.status === PaymentAccountStatus.ACTIVE,
        revenueSharePercentage: '95.00', // Platform default revenue share
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

  async getMerchantDetails(id: number): Promise<any> {
    const business = await this.businessRepo
      .createQueryBuilder('business')
      .leftJoinAndSelect('business.user', 'user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('user.kyc', 'kyc')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('business.businessType', 'businessType')
      .leftJoinAndSelect('business.paymentAccount', 'paymentAccount')
      .leftJoin('orders', 'order', 'order.businessId = business.id')
      .leftJoin('products', 'product', 'product.businessId = business.id')
      .leftJoin('transactions', 'transaction', 'transaction.businessId = business.id')
      .where('business.id = :id', { id })
      // Use getRawAndEntities to get the full object + aggregates
      .addSelect('COUNT(DISTINCT order.id)', 'totalOrders')
      .addSelect('COALESCE(SUM(order.total), 0)', 'totalSalesVolume')
      .addSelect('COUNT(DISTINCT product.id)', 'totalProducts')
      .addSelect('COUNT(DISTINCT transaction.id)', 'totalTransactions')
      .groupBy('business.id')
      .addGroupBy('user.id')
      .addGroupBy('profile.id')
      .addGroupBy('kyc.id')
      .addGroupBy('role.id')
      .addGroupBy('businessType.id')
      .addGroupBy('paymentAccount.id')
      .getRawAndEntities();

    if (!business || !business.entities.length) {
      ErrorHelper.NotFoundException(`Merchant with ID ${id} not found`);
    }

    const entity = business.entities[0];
    const raw = business.raw[0];

    return {
      id: entity.id,
      businessName: entity.businessName,
      storeName: entity.storeName,
      slug: entity.slug,
      ownerEmail: entity.user?.email || 'N/A',
      userId: entity.user?.id,
      phoneNumber: entity.user?.profile?.phone || null,
      kycTier: entity.user?.kyc?.tier || null,
      businessType: entity.businessType?.name || 'N/A',
      location: entity.location,
      totalOrders: parseInt(raw.totalOrders) || 0,
      totalSalesVolume: parseFloat(raw.totalSalesVolume).toFixed(2),
      totalProducts: parseInt(raw.totalProducts) || 0,
      totalTransactions: parseInt(raw.totalTransactions) || 0,
      isSubaccountActive: entity.paymentAccount?.status === PaymentAccountStatus.ACTIVE,
      revenueSharePercentage: '95.00', // Default
      dateRegistered: entity.createdAt,
      lastUpdated: entity.updatedAt,
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

  private async assignMerchantRole(user: User): Promise<void> {
    // Get Merchant role
    const merchantRole = await this.roleRepo.findOne({
      where: {
        name: 'Merchant',
        userType: UserType.USER,
        status: RoleStatus.ACTIVE,
      },
    });

    if (!merchantRole) {
      this.logger.error('Merchant role not found in database!');
      ErrorHelper.InternalServerErrorException(
        'System configuration error: Merchant role not found',
      );
    }

    // Assign role to user
    user.roleId = merchantRole.id;
    user.userType = UserType.USER;
    user.status = user.status || UserStatus.ACTIVE;

    await this.userRepos.save(user);
  }

}