import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Not, Repository } from "typeorm";
import { UserRole, UserType } from "../../common/auth/user-role.enum";
import { ErrorHelper } from "../../common/utils";
import { CryptoUtil } from "../../common/utils/crypto.util";
import { Business } from "../businesses/business.entity";
import { Category } from "../category/entity/category.entity";
import { Order } from "../order/entity/order.entity";
import { Product } from "../product/entity/product.entity";
import { Role, RoleStatus } from "../roles/entities/role.entity";
import { Transaction } from "../transaction/entity/transaction.entity";
import { User } from "../users";
import { UserStatus } from "../users/entity/user.entity";
import { CreateAdminDto } from "./dto/create-admin.dto";
import { DashboardStatsDto } from "./dto/dashboard-stats.dto";
import { UpdateAdminDto } from "./dto/update-admin.dto";
import { MerchantMetricsResponse, RecentMerchantMetricsQueryDto, RecentMerchantWithSales } from "./dto/merchant-metrics.dto";
import { PaymentStatus } from "../order/interfaces/order.interface";


@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) { }

  async createAdmin(
    createAdminDto: CreateAdminDto,
    createdBy: number,
  ): Promise<User> {
    // Check if email already exists
    const existingEmail = await this.userRepository.findOne({
      where: { email: createAdminDto.email },
    });

    if (existingEmail) {
      ErrorHelper.ConflictException('Email already in use');
    }

    // Check if phone already exists
    const existingPhone = await this.userRepository.findOne({
      where: { phone: createAdminDto.phone },
    });

    if (existingPhone) {
      ErrorHelper.ConflictException('Phone number already in use');
    }

    // Verify role exists and is admin type
    const role = await this.roleRepository.findOne({
      where: { id: createAdminDto.roleId },
    });

    if (!role) {
      ErrorHelper.NotFoundException('Role not found');
    }

    if (role.userType !== UserType.ADMIN) {
      ErrorHelper.BadRequestException('Can only assign admin roles to admin users');
    }

    if (role.status !== RoleStatus.ACTIVE) {
      ErrorHelper.BadRequestException('Cannot assign an inactive role');
    }

    // Hash password
    const hashedPassword = CryptoUtil.hashPassword(createAdminDto.password);

    // Create admin user
    const admin = this.userRepository.create({
      firstName: createAdminDto.firstName,
      lastName: createAdminDto.lastName,
      email: createAdminDto.email,
      phone: createAdminDto.phone,
      password: hashedPassword,
      userType: UserType.ADMIN,
      roleId: createAdminDto.roleId,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
      isPhoneVerified: true,
      isOnboardingCompleted: true,
      deviceId: createAdminDto.deviceId || 'admin-device',
      longitude: 0,
      latitude: 0,
      createdBy,
    });

    const savedAdmin = await this.userRepository.save(admin);
    this.logger.log(`Admin user created: ${savedAdmin.email} by user ${createdBy}`);

    // Remove sensitive data
    const { password, pin, ...adminWithoutSensitiveData } = savedAdmin;
    return adminWithoutSensitiveData as User;
  }

  async updateAdmin(
    adminId: number,
    updateAdminDto: UpdateAdminDto,
    updatedBy: number,
  ): Promise<User> {
    const admin = await this.userRepository.findOne({
      where: { id: adminId },
      relations: ['role'],
    });

    if (!admin) {
      ErrorHelper.NotFoundException('Admin not found');
    }

    if (admin.userType !== UserType.ADMIN) {
      ErrorHelper.BadRequestException('User is not an admin');
    }

    // Check email uniqueness
    if (updateAdminDto.email && updateAdminDto.email !== admin.email) {
      const existingEmail = await this.userRepository.findOne({
        where: { email: updateAdminDto.email, id: Not(adminId) },
      });

      if (existingEmail) {
        ErrorHelper.ConflictException('Email already in use');
      }
    }

    // Check phone uniqueness
    if (updateAdminDto.phone && updateAdminDto.phone !== admin.phone) {
      const existingPhone = await this.userRepository.findOne({
        where: { phone: updateAdminDto.phone, id: Not(adminId) },
      });

      if (existingPhone) {
        ErrorHelper.ConflictException('Phone number already in use');
      }
    }

    // Verify new role if changing
    if (updateAdminDto.roleId && updateAdminDto.roleId !== admin.roleId) {
      const newRole = await this.roleRepository.findOne({
        where: { id: updateAdminDto.roleId },
      });

      if (!newRole) {
        ErrorHelper.NotFoundException('Role not found');
      }

      if (newRole.userType !== UserType.ADMIN) {
        ErrorHelper.BadRequestException('Can only assign admin roles');
      }

      if (newRole.status !== RoleStatus.ACTIVE) {
        ErrorHelper.BadRequestException('Cannot assign an inactive role');
      }
    }

    Object.assign(admin, updateAdminDto);

    const updatedAdmin = await this.userRepository.save(admin);
    this.logger.log(`Admin updated: ${updatedAdmin.email} by user ${updatedBy}`);

    const { password, pin, ...adminWithoutSensitiveData } = updatedAdmin;
    return adminWithoutSensitiveData as User;
  }

  async getAdminById(adminId: number): Promise<User> {
    const admin = await this.userRepository.findOne({
      where: { id: adminId, userType: UserType.ADMIN },
      relations: ['role'],
    });

    if (!admin) {
      ErrorHelper.NotFoundException('Admin not found');
    }

    const { password, pin, ...adminWithoutSensitiveData } = admin;
    return adminWithoutSensitiveData as User;
  }

  async getAdminStatistics(): Promise<any> {
    const totalAdmins = await this.userRepository.count({
      where: { userType: UserType.ADMIN },
    });

    const activeAdmins = await this.userRepository.count({
      where: { userType: UserType.ADMIN, status: UserStatus.ACTIVE },
    });

    const inactiveAdmins = await this.userRepository.count({
      where: { userType: UserType.ADMIN, status: UserStatus.INACTIVE },
    });

    const suspendedAdmins = await this.userRepository.count({
      where: { userType: UserType.ADMIN, status: UserStatus.SUSPENDED },
    });

    const bannedAdmins = await this.userRepository.count({
      where: { userType: UserType.ADMIN, status: UserStatus.BANNED },
    });

    // Get admin count by role
    const adminsByRole = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.role', 'role')
      .where('user.userType = :userType', { userType: UserType.ADMIN })
      .select(['role.id', 'role.name'])
      .addSelect('COUNT(user.id)', 'count')
      .groupBy('role.id')
      .addGroupBy('role.name')
      .getRawMany();

    // Recent admins (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Use query builder for complex queries with Not()
    const recentAdmins = await this.userRepository
      .createQueryBuilder('user')
      .where('user.userType = :userType', { userType: UserType.ADMIN })
      .andWhere('user.createdAt >= :thirtyDaysAgo', { thirtyDaysAgo })
      .getCount();

    // Last login statistics - use query builder
    const adminsWithRecentLogin = await this.userRepository
      .createQueryBuilder('user')
      .where('user.userType = :userType', { userType: UserType.ADMIN })
      .andWhere('user.lastLoginAt IS NOT NULL')
      .getCount();

    return {
      overview: {
        totalAdmins,
        activeAdmins,
        inactiveAdmins,
        suspendedAdmins,
        bannedAdmins,
      },
      byRole: adminsByRole.map(item => ({
        roleId: item.role_id,
        roleName: item.role_name,
        count: parseInt(item.count),
      })),
      activity: {
        recentlyCreated: recentAdmins,
        withRecentLogin: adminsWithRecentLogin,
      },
    };
  }

  async getDashboardStats(): Promise<DashboardStatsDto> {
    const [totalOrders, totalMerchants, totalProducts, totalCategories, totalTransactions] =
      await Promise.all([
        this.orderRepository.count(),
        this.businessRepository.count(),
        this.productRepository.count(),
        this.categoryRepository.count(),
        this.transactionRepository.count(),
      ]);

    return {
      totalOrders,
      totalMerchants,
      totalProducts,
      totalCategories,
      totalTransactions,
    };
  }

  async deleteAdmin(adminId: number, deletedBy: number): Promise<void> {
    const admin = await this.userRepository.findOne({
      where: { id: adminId },
      relations: ['role'],
    });

    if (!admin) {
      ErrorHelper.NotFoundException('Admin not found');
    }

    if (admin.userType !== UserType.ADMIN) {
      ErrorHelper.BadRequestException('User is not an admin');
    }

    // Prevent deleting Super Admin
    if (admin.role?.name === UserRole.SUPER_ADMIN) {
      ErrorHelper.BadRequestException('Cannot delete Super Admin users');
    }

    await this.userRepository.delete(adminId);
    this.logger.log(`Admin deleted: ${admin.email} by user ${deletedBy}`);
  }

  async recentMerchantMetrics(
    query: RecentMerchantMetricsQueryDto,
  ): Promise<any> {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
        fromDate,
        toDate,
      } = query;
  
      const offset = (page - 1) * limit;
  
      /* ---------------------------------------------
         SALES AGGREGATION QUERY
      ----------------------------------------------*/
      const salesQuery = this.orderRepository
        .createQueryBuilder('order')
        .select('order.businessId', 'businessId')
        .addSelect('SUM(order.total)', 'totalSales')
        .addSelect('COUNT(order.id)', 'salesVolume')
        .where('order.paymentStatus = :status', {
          status: PaymentStatus.PAID,
        });
  
      if (fromDate) {
        salesQuery.andWhere('order.createdAt >= :fromDate', { fromDate });
      }
  
      if (toDate) {
        salesQuery.andWhere('order.createdAt <= :toDate', { toDate });
      }
  
      const salesData = await salesQuery
        .groupBy('order.businessId')
        .getRawMany();
  
      const businessIds = salesData.map(d => d.businessId);
  
      if (!businessIds.length) {
        return {
          data: [],
          meta: {
            page,
            limit,
            total: 0,
          },
        };
      }
  
      /* ---------------------------------------------
         MERCHANT QUERY
      ----------------------------------------------*/
      const merchantQuery = this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.business', 'business')
        .where('user.userType = :userType', { userType: UserType.USER })
        .andWhere('user.status = :status', { status: UserStatus.ACTIVE })
        .andWhere('business.id IN (:...businessIds)', { businessIds });
  
      if (search) {
        merchantQuery.andWhere(
          `(
            LOWER(user.firstName) LIKE LOWER(:search) OR
            LOWER(user.lastName) LIKE LOWER(:search) OR
            LOWER(user.email) LIKE LOWER(:search) OR
            LOWER(business.businessName) LIKE LOWER(:search)
          )`,
          { search: `%${search}%` },
        );
      }
  
      const total = await merchantQuery.getCount();
  
      merchantQuery
        .orderBy(
          sortBy === 'createdAt'
            ? 'user.createdAt'
            : sortBy === 'totalSales'
            ? 'sales.totalSales'
            : 'sales.salesVolume',
          sortOrder,
        )
        .offset(offset)
        .limit(limit);
  
      const merchants = await merchantQuery.getMany();
  
      /* ---------------------------------------------
         MERGE SALES DATA
      ----------------------------------------------*/
      const data: RecentMerchantWithSales[] = merchants.map(merchant => {
        const merchantSales = salesData.find(
          d => d.businessId === merchant.business?.id,
        );
  
        return {
          id: merchant.id,
          firstName: merchant.firstName,
          lastName: merchant.lastName,
          email: merchant.email,
          phone: merchant.phone,
          profilePicture: merchant.profilePicture,
          businessName: merchant.business?.businessName,
          totalSales: merchantSales
            ? Number(merchantSales.totalSales)
            : 0,
          salesVolume: merchantSales
            ? Number(merchantSales.salesVolume)
            : 0,
          dateCreated: merchant.createdAt,
        };
      });
  
      return {
        data,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to return recent merchant metrics: ${error.message}`,
        error.stack,
      );
      throw ErrorHelper.InternalServerErrorException(
        'Failed to return merchant metrics',
      );
    }
  }
  

 async totalMerchantMetrics():Promise<MerchantMetricsResponse>{
  try{

    const [totalMerchants, activeMerchants] = await Promise.all([
      this.userRepository.count({
        where: { userType: UserType.USER },
      }),
      this.userRepository.count({
        where: {
          userType: UserType.USER,
          status: UserStatus.ACTIVE,
        },
      }),
    ]);

    const inactiveMerchants = Math.max(
      totalMerchants - activeMerchants,
      0,
    );

    return {
      totalMerchants,
      activeMerchants,
      inactiveMerchants,
    };
  }catch(error){
    ErrorHelper.InternalServerErrorException('Failed to return total merchant metrics')
  }
 }
}
