import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CryptoUtil } from '../../common/utils/crypto.util';
import { User, UserStatus } from '../../core/users/entity/user.entity';
import { UserType } from '../../common/auth/user-role.enum';
import { Role } from '../../core/roles/entities/role.entity';
import { Business } from '../../core/businesses/business.entity';
import { Product } from '../../core/product/entity/product.entity';
import { OnboardingStep } from '../../common/enums/user.enum';
import { BusinessType } from '../../core/businesses/business-type.entity';
import { Category } from '../../core/category/entity/category.entity';
import { UserSecurity } from '../../core/users/entities/user-security.entity';

@Injectable()
export class TestDataSeedService {
  private readonly logger = new Logger(TestDataSeedService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(BusinessType)
    private businessTypeRepository: Repository<BusinessType>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(UserSecurity)
    private userSecurityRepository: Repository<UserSecurity>,
  ) { }

  async seed() {
    this.logger.log('========================================');
    this.logger.log('Starting Test Data Seed...');
    this.logger.log('========================================');

    // 1. Create business types
    await this.createBusinessTypes();

    // 2. Create categories
    await this.createCategories();

    // 3. Create test users (regular users, admins, super admin)
    await this.createTestUsers();

    // 4. Create test businesses
    await this.createTestBusinesses();

    // 5. Create test products
    await this.createTestProducts();

    this.logger.log('========================================');
    this.logger.log('Test Data Seed Completed Successfully! ✓');
    this.logger.log('========================================');
  }

  private async createBusinessTypes() {
    this.logger.log('Creating business types...');

    const types = [
      'E-commerce',
      'Fashion & Apparel',
      'Food & Beverage',
      'Electronics',
      'Beauty & Cosmetics',
      'Home & Garden',
      'Sports & Fitness',
      'Books & Media',
      'Toys & Games',
      'Health & Wellness',
      'Services',
      'Other',
    ];

    for (const typeName of types) {
      const existing = await this.businessTypeRepository.findOne({
        where: { name: typeName },
      });

      if (!existing) {
        await this.businessTypeRepository.save({ name: typeName });
        this.logger.log(`  ✓ Created business type: ${typeName}`);
      }
    }
  }

  private async createCategories() {
    this.logger.log('Creating categories...');

    const categories = [
      'Electronics',
      'Fashion',
      'Home & Kitchen',
      'Beauty & Personal Care',
      'Sports & Outdoors',
      'Books',
      'Toys & Games',
      'Food & Beverages',
      'Health & Wellness',
      'Automotive',
    ];

    for (const categoryName of categories) {
      const existing = await this.categoryRepository.findOne({
        where: { name: categoryName },
      });

      if (!existing) {
        await this.categoryRepository.save({ name: categoryName });
        this.logger.log(`  ✓ Created category: ${categoryName}`);
      }
    }
  }

  private async createTestUsers() {
    this.logger.log('Creating test users...');

    const merchantRole = await this.roleRepository.findOne({
      where: { name: 'Merchant', userType: UserType.USER },
    });

    const adminRole = await this.roleRepository.findOne({
      where: { name: 'Admin', userType: UserType.ADMIN },
    });

    const moderatorRole = await this.roleRepository.findOne({
      where: { name: 'Moderator', userType: UserType.ADMIN },
    });

    if (!merchantRole || !adminRole || !moderatorRole) {
      this.logger.error('  ✗ Required roles not found!');
      return;
    }

    const testUsers = [
      // Regular merchant users
      {
        email: 'merchant1@test.com',
        password: 'Test@123',
        userType: UserType.USER,
        roleId: merchantRole.id,
        profile: {
          firstName: 'John',
          lastName: 'Merchant',
          phone: '+2348012345671',
          isPhoneVerified: true,
        },
        hasBusiness: true,
      },
      {
        email: 'merchant2@test.com',
        password: 'Test@123',
        userType: UserType.USER,
        roleId: merchantRole.id,
        profile: {
          firstName: 'Jane',
          lastName: 'Store',
          phone: '+2348012345672',
          isPhoneVerified: true,
        },
        hasBusiness: true,
      },
      {
        email: 'merchant3@test.com',
        password: 'Test@123',
        userType: UserType.USER,
        roleId: merchantRole.id,
        profile: {
          firstName: 'Mike',
          lastName: 'Shop',
          phone: '+2348012345673',
          isPhoneVerified: true,
        },
        hasBusiness: true,
      },
      // Admin users
      {
        email: 'admin@test.com',
        password: 'Admin@123',
        userType: UserType.ADMIN,
        roleId: adminRole.id,
        profile: {
          firstName: 'Admin',
          lastName: 'User',
          phone: '+2348012345680',
          isPhoneVerified: true,
        },
        hasBusiness: false,
      },
      // Moderator user
      {
        email: 'moderator@test.com',
        password: 'Moderator@123',
        userType: UserType.ADMIN,
        roleId: moderatorRole.id,
        profile: {
          firstName: 'Moderator',
          lastName: 'User',
          phone: '+2348012345681',
          isPhoneVerified: true,
        },
        hasBusiness: false,
      },
      // Regular user without business
      {
        email: 'user@test.com',
        password: 'User@123',
        userType: UserType.USER,
        roleId: merchantRole.id,
        profile: {
          firstName: 'Regular',
          lastName: 'User',
          phone: '+2348012345690',
          isPhoneVerified: false,
        },
        hasBusiness: false,
      },
    ];

    for (const userData of testUsers) {
      const existing = await this.userRepository.findOne({
        where: { email: userData.email },
        relations: ['security'],
      });

      if (!existing) {
        const user = this.userRepository.create({
          email: userData.email,
          password: CryptoUtil.hashPassword(userData.password),
          userType: userData.userType,
          roleId: userData.roleId,
          status: UserStatus.ACTIVE,
          isEmailVerified: true,
          profile: {
            firstName: userData.profile.firstName,
            lastName: userData.profile.lastName,
            phone: userData.profile.phone,
            isPhoneVerified: userData.profile.isPhoneVerified,
          },
          onboarding: {
            currentStep: userData.hasBusiness
              ? OnboardingStep.AUTHENTICATION_PIN
              : OnboardingStep.PERSONAL_INFORMATION,
            isCompleted: userData.hasBusiness,
            progressPercentage: userData.hasBusiness ? 100 : 20,
            completedAt: userData.hasBusiness ? new Date() : undefined,
          },
          security: {
            deviceId: 'seed-device',
            longitude: 3.3792,
            latitude: 6.5244,
            transactionPin: CryptoUtil.encryptPin('1234'), // Seed Transaction PIN
            transactionPinChangedAt: null as any, // Ensure cooling period doesn't block immediate tests
          },
        });

        await this.userRepository.save(user);
        this.logger.log(
          `  ✓ Created user: ${userData.email} (${userData.userType})`,
        );
      } else {
        // Ensure Transaction PIN is set for existing users (Migration support)
        if (existing.security && !existing.security.transactionPin) {
          await this.userSecurityRepository.update(existing.security.id, {
            transactionPin: CryptoUtil.encryptPin('1234'),
            transactionPinChangedAt: null as any,
          });
          this.logger.log(`  ✓ Updated Transaction PIN for existing user: ${userData.email}`);
        } else if (!existing.security) {
          // Create security if missing entirely (edge case)
          const security = this.userSecurityRepository.create({
            userId: existing.id,
            deviceId: 'seed-device',
            transactionPin: CryptoUtil.encryptPin('1234'),
            transactionPinChangedAt: null as any,
          });
          await this.userSecurityRepository.save(security);
          this.logger.log(`  ✓ Created Security + PIN for existing user: ${userData.email}`);
        }
      }
    }
  }

  private async createTestBusinesses() {
    this.logger.log('Creating test businesses...');

    const merchants = await this.userRepository.find({
      where: { email: 'merchant1@test.com' },
      relations: ['profile'],
    });

    const merchant1 = await this.userRepository.findOne({
      where: { email: 'merchant1@test.com' },
      relations: ['profile'],
    });

    const merchant2 = await this.userRepository.findOne({
      where: { email: 'merchant2@test.com' },
      relations: ['profile'],
    });

    const merchant3 = await this.userRepository.findOne({
      where: { email: 'merchant3@test.com' },
      relations: ['profile'],
    });

    const ecommerceType = await this.businessTypeRepository.findOne({
      where: { name: 'E-commerce' },
    });

    const fashionType = await this.businessTypeRepository.findOne({
      where: { name: 'Fashion & Apparel' },
    });

    const electronicsType = await this.businessTypeRepository.findOne({
      where: { name: 'Electronics' },
    });

    if (merchant1 && ecommerceType) {
      const existingBusiness = await this.businessRepository.findOne({
        where: { userId: merchant1.id },
      });

      if (!existingBusiness) {
        const business = this.businessRepository.create({
          userId: merchant1.id,
          businessName: 'TechHub Store',
          businessDescription:
            'Your one-stop shop for all tech gadgets and accessories',
          location: '123 Tech Street, Lagos',
          slug: 'techhub-store',
          logo: 'https://via.placeholder.com/200x200?text=TechHub',
          coverImage: 'https://via.placeholder.com/1200x400?text=TechHub+Cover',
          businessType: ecommerceType,
        });

        await this.businessRepository.save(business);

        // Update user with businessId
        merchant1.businessId = business.id;
        await this.userRepository.save(merchant1);

        this.logger.log('  ✓ Created business: TechHub Store');
      } else {
        // Ensure user has businessId set anyway
        if (merchant1.businessId !== existingBusiness.id) {
          merchant1.businessId = existingBusiness.id;
          await this.userRepository.save(merchant1);
          this.logger.log('  ✓ Linked existing business TechHub Store to merchant1');
        }
      }
    }

    if (merchant2 && fashionType) {
      const existingBusiness = await this.businessRepository.findOne({
        where: { userId: merchant2.id },
      });

      if (!existingBusiness) {
        const business = this.businessRepository.create({
          userId: merchant2.id,
          businessName: 'Fashion Haven',
          businessDescription:
            'Trendy fashion and accessories for everyone',
          location: '456 Fashion Avenue, Lagos',
          slug: 'fashion-haven',
          logo: 'https://via.placeholder.com/200x200?text=Fashion+Haven',
          coverImage:
            'https://via.placeholder.com/1200x400?text=Fashion+Haven+Cover',
          businessType: fashionType,
        });

        await this.businessRepository.save(business);

        // Update user with businessId
        merchant2.businessId = business.id;
        await this.userRepository.save(merchant2);

        this.logger.log('  ✓ Created business: Fashion Haven');
      }
    }

    if (merchant3 && electronicsType) {
      const existingBusiness = await this.businessRepository.findOne({
        where: { userId: merchant3.id },
      });

      if (!existingBusiness) {
        const business = this.businessRepository.create({
          userId: merchant3.id,
          businessName: 'Gadget World',
          businessDescription:
            'Latest gadgets and electronic devices at best prices',
          location: '789 Electronics Road, Lagos',
          slug: 'gadget-world',
          logo: 'https://via.placeholder.com/200x200?text=Gadget+World',
          coverImage:
            'https://via.placeholder.com/1200x400?text=Gadget+World+Cover',
          businessType: electronicsType,
        });

        await this.businessRepository.save(business);

        // Update user with businessId
        merchant3.businessId = business.id;
        await this.userRepository.save(merchant3);

        this.logger.log('  ✓ Created business: Gadget World');
      }
    }
  }

  private async createTestProducts() {
    this.logger.log('Creating test products...');

    const techHub = await this.businessRepository.findOne({
      where: { businessName: 'TechHub Store' },
    });

    const fashionHaven = await this.businessRepository.findOne({
      where: { businessName: 'Fashion Haven' },
    });

    const gadgetWorld = await this.businessRepository.findOne({
      where: { businessName: 'Gadget World' },
    });

    const electronicsCategory = await this.categoryRepository.findOne({
      where: { name: 'Electronics' },
    });

    const fashionCategory = await this.categoryRepository.findOne({
      where: { name: 'Fashion' },
    });

    // TechHub products
    if (techHub && electronicsCategory) {
      const techProducts = [
        {
          name: 'Wireless Bluetooth Headphones',
          description:
            'High-quality wireless headphones with noise cancellation',
          price: 25000,
          quantityInStock: 50,
          imageUrls: ['https://via.placeholder.com/400x400?text=Headphones'],
        },
        {
          name: 'Smart Watch Pro',
          description: 'Feature-rich smartwatch with health tracking',
          price: 45000,
          quantityInStock: 30,
          imageUrls: ['https://via.placeholder.com/400x400?text=Smart+Watch'],
        },
        {
          name: 'USB-C Fast Charger',
          description: '65W fast charging adapter with multiple ports',
          price: 8000,
          quantityInStock: 100,
          imageUrls: ['https://via.placeholder.com/400x400?text=Charger'],
        },
        {
          name: 'Portable Power Bank 20000mAh',
          description: 'High capacity power bank for all devices',
          price: 15000,
          quantityInStock: 75,
          imageUrls: ['https://via.placeholder.com/400x400?text=Power+Bank'],
        },
      ];

      for (const productData of techProducts) {
        const existing = await this.productRepository.findOne({
          where: {
            name: productData.name,
            businessId: techHub.id,
          },
        });

        if (!existing) {
          const product = this.productRepository.create({
            ...productData,
            userId: techHub.userId,
            businessId: techHub.id,
            categoryId: electronicsCategory.id,
            hasVariation: false,
          });

          await this.productRepository.save(product);
          this.logger.log(`  ✓ Created product: ${productData.name}`);
        }
      }
    }

    // Fashion Haven products
    if (fashionHaven && fashionCategory) {
      const fashionProducts = [
        {
          name: 'Designer T-Shirt',
          description: 'Premium quality cotton t-shirt',
          price: 5000,
          quantityInStock: 120,
          imageUrls: ['https://via.placeholder.com/400x400?text=T-Shirt'],
          hasVariation: true,
          colors: ['Red', 'Blue', 'Black', 'White'],
        },
        {
          name: 'Leather Handbag',
          description: 'Elegant leather handbag for women',
          price: 35000,
          quantityInStock: 25,
          imageUrls: ['https://via.placeholder.com/400x400?text=Handbag'],
        },
        {
          name: 'Sneakers',
          description: 'Comfortable casual sneakers',
          price: 18000,
          quantityInStock: 60,
          imageUrls: ['https://via.placeholder.com/400x400?text=Sneakers'],
          hasVariation: true,
        },
      ];

      for (const productData of fashionProducts) {
        const existing = await this.productRepository.findOne({
          where: {
            name: productData.name,
            businessId: fashionHaven.id,
          },
        });

        if (!existing) {
          const product = this.productRepository.create({
            ...productData,
            userId: fashionHaven.userId,
            businessId: fashionHaven.id,
            categoryId: fashionCategory.id,
          });

          await this.productRepository.save(product);
          this.logger.log(`  ✓ Created product: ${productData.name}`);
        }
      }
    }

    // Gadget World products
    if (gadgetWorld && electronicsCategory) {
      const gadgetProducts = [
        {
          name: 'Gaming Mouse',
          description: 'RGB gaming mouse with programmable buttons',
          price: 12000,
          quantityInStock: 40,
          imageUrls: ['https://via.placeholder.com/400x400?text=Gaming+Mouse'],
        },
        {
          name: 'Mechanical Keyboard',
          description: 'RGB mechanical keyboard for gamers',
          price: 28000,
          quantityInStock: 35,
          imageUrls: ['https://via.placeholder.com/400x400?text=Keyboard'],
        },
        {
          name: 'Webcam HD 1080p',
          description: 'HD webcam for video calls and streaming',
          price: 22000,
          quantityInStock: 45,
          imageUrls: ['https://via.placeholder.com/400x400?text=Webcam'],
        },
      ];

      for (const productData of gadgetProducts) {
        const existing = await this.productRepository.findOne({
          where: {
            name: productData.name,
            businessId: gadgetWorld.id,
          },
        });

        if (!existing) {
          const product = this.productRepository.create({
            ...productData,
            userId: gadgetWorld.userId,
            businessId: gadgetWorld.id,
            categoryId: electronicsCategory.id,
            hasVariation: false,
          });

          await this.productRepository.save(product);
          this.logger.log(`  ✓ Created product: ${productData.name}`);
        }
      }
    }
  }
}
