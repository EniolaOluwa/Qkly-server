import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { UserType } from "../../common/auth/user-role.enum";
import { CryptoUtil } from "../../common/utils/crypto.util";
import { Role, RoleStatus } from "../../core/roles/entities/role.entity";
import { User } from "../../core/users";
import { UserStatus } from "../../core/users/entity/user.entity";

@Injectable()
export class RolesSeedService {
  private readonly logger = new Logger(RolesSeedService.name);

  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
  ) { }

  async seed() {
    this.logger.log('========================================');
    this.logger.log('Starting Database Seed...');
    this.logger.log('========================================');

    // Create system roles
    await this.createSystemRoles();

    // Create super admin user
    await this.createSuperAdminUser();

    this.logger.log('========================================');
    this.logger.log('Database Seed Completed Successfully! ✓');
    this.logger.log('========================================');
  }

  private async createSystemRoles() {
    this.logger.log('Creating system roles...');

    const systemRoles = [
      {
        name: 'Super Admin',
        description: 'Full system access with all permissions',
        userType: UserType.SUPER_ADMIN,
        permissions: ['*'],
        priority: 100,
        isSystemRole: true,
        status: RoleStatus.ACTIVE,
      },
      {
        name: 'Admin',
        description: 'Administrative access with most permissions',
        userType: UserType.ADMIN,
        permissions: [
          'users.read',
          'users.write',
          'users.suspend',
          'roles.read',
          'transactions.read',
          'transactions.approve',
          'transactions.refund',
          'reports.read',
          'reports.export',
          'business.read',
          'business.approve',
          'wallet.read',
          'settings.read',
          'audit.read',
        ],
        priority: 50,
        isSystemRole: true,
        status: RoleStatus.ACTIVE,
      },
      {
        name: 'Admin',
        description: 'Basic administrative functions',
        userType: UserType.ADMIN,
        permissions: [
          'users.read',
          'transactions.read',
          'reports.read',
          'business.read',
          'wallet.read',
        ],
        priority: 30,
        isSystemRole: true,
        status: RoleStatus.ACTIVE,
      },
      {
        name: 'Moderator',
        description: 'Moderator with limited administrative permissions',
        userType: UserType.ADMIN,
        permissions: [
          'users.read',
          'transactions.read',
          'transactions.approve',
          'business.read',
          'business.approve',
          'reports.read',
        ],
        priority: 40,
        isSystemRole: true,
        status: RoleStatus.ACTIVE,
      },
      {
        name: 'Merchant',
        description: 'Standard merchant user',
        userType: UserType.USER,
        permissions: [
          'transactions.read',
          'transactions.create',
          'wallet.read',
          'business.read',
          'business.write',
          'reports.read',
        ],
        priority: 10,
        isSystemRole: true,
        status: RoleStatus.ACTIVE,
      },
    ];

    for (const roleData of systemRoles) {
      const existingRole = await this.roleRepository.findOne({
        where: { name: roleData.name },
      });

      if (!existingRole) {
        const role = await this.roleRepository.save(roleData);
        this.logger.log(`  ✓ Created role: ${role.name}`);
      } else {
        // Update existing system roles with latest permissions
        existingRole.permissions = roleData.permissions;
        existingRole.description = roleData.description;
        existingRole.priority = roleData.priority;
        await this.roleRepository.save(existingRole);
        this.logger.log(`  ✓ Updated role: ${roleData.name}`);
      }
    }
  }

  private async createSuperAdminUser() {
    this.logger.log('Creating Super Admin user...');

    // Get Super Admin role
    const superAdminRole = await this.roleRepository.findOne({
      where: { name: 'Super Admin' },
    });

    if (!superAdminRole) {
      this.logger.error('  ✗ Super Admin role not found!');
      return;
    }

    // Get super admin credentials from environment
    const email = this.configService.get<string>(
      'SUPER_ADMIN_EMAIL',
      'superadmin@qkly.com',
    );
    const password = this.configService.get<string>(
      'SUPER_ADMIN_PASSWORD',
      'SuperAdmin@123',
    );
    const firstName = this.configService.get<string>(
      'SUPER_ADMIN_FIRST_NAME',
      'Super',
    );
    const lastName = this.configService.get<string>(
      'SUPER_ADMIN_LAST_NAME',
      'Admin',
    );
    const phone = this.configService.get<string>(
      'SUPER_ADMIN_PHONE',
      '+2348000000000',
    );

    // Check if super admin already exists
    const existingSuperAdmin = await this.userRepository.findOne({
      where: { email },
    });

    if (existingSuperAdmin) {
      this.logger.log(`  ✓ Super Admin already exists: ${email}`);
      return;
    }

    // Create super admin user with nested entities
    const superAdminUser = this.userRepository.create({
      email,
      password: CryptoUtil.hashPassword(password),
      userType: UserType.ADMIN,
      roleId: superAdminRole.id,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
      isPhoneVerified: true,
      profile: {
        firstName,
        lastName,
        phone,
        isPhoneVerified: true,
      },
      onboarding: {
        isCompleted: true,
        progressPercentage: 100,
        completedAt: new Date(),
      },
      security: {
        deviceId: 'system',
        longitude: 0,
        latitude: 0,
      },
    });

    await this.userRepository.save(superAdminUser);

    this.logger.log('  ✓ Super Admin user created');
    this.logger.log('  ═══════════════════════════════════════');
    this.logger.log('  📧 Email: ' + email);
    this.logger.log('  🔑 Password: ' + password);
    this.logger.log('  ═══════════════════════════════════════');
    this.logger.warn('  ⚠️  IMPORTANT: Change this password immediately!');
  }

  // Migrate existing users to Merchant role
  async migrateExistingUsers() {
    this.logger.log('Migrating existing users...');

    const merchantRole = await this.roleRepository.findOne({
      where: { name: 'Merchant', userType: UserType.USER },
    });

    if (!merchantRole) {
      this.logger.error('  ✗ Merchant role not found!');
      return;
    }

    // Find users without roles
    const usersWithoutRole = await this.userRepository.find({
      where: { roleId: IsNull() },
    });

    if (usersWithoutRole.length === 0) {
      this.logger.log('  ✓ No users need migration');
      return;
    }

    for (const user of usersWithoutRole) {
      user.userType = UserType.USER;
      user.roleId = merchantRole.id;
      user.status = user.status || UserStatus.ACTIVE;
      await this.userRepository.save(user);
    }

    this.logger.log(`  ✓ Migrated ${usersWithoutRole.length} users to Merchant role`);
  }
}
