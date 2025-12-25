# Implementation Guide - Database Architecture Redesign

## Overview

This guide provides step-by-step instructions for implementing the new database architecture for the Qkly e-commerce platform.

---

## What Has Been Completed ✅

### 1. **New Entity Files Created (40+ entities)**
All entity files have been created in their respective directories:

- ✅ **User Domain**: UserProfile, UserKYC, UserSecurity, UserOnboarding, Wallet, BankAccount
- ✅ **Business Domain**: BusinessPaymentAccount, BusinessSettlementConfig
- ✅ **Product Domain**: ProductVariant, ProductImage, InventoryLog, StockReservation
- ✅ **Order Domain**: OrderStatusHistory, OrderPayment, OrderShipment, OrderRefund
- ✅ **Payment Domain**: Settlement
- ✅ **Cart Domain**: Cart, CartItem, CartAbandonment
- ✅ **Coupon Domain**: Coupon, CouponUsage
- ✅ **Customer Domain**: CustomerProfile, Address
- ✅ **Notification Domain**: EmailQueue, EmailLog
- ✅ **Audit Domain**: AuditLog, SystemEvent

### 2. **Enum Files Created (7 files)**
All enums standardized in `/src/common/enums/`:

- ✅ user.enum.ts
- ✅ payment.enum.ts
- ✅ order.enum.ts
- ✅ settlement.enum.ts
- ✅ inventory.enum.ts
- ✅ coupon.enum.ts
- ✅ notification.enum.ts

### 3. **Documentation Created**
- ✅ DATABASE_REDESIGN_SUMMARY.md - Architecture overview
- ✅ MONNIFY_REMOVAL_PLAN.md - Monnify deprecation strategy
- ✅ This file - Implementation guide

---

## What Needs To Be Done 🔨

### **Step 1: Fix Circular Dependencies**

Many new entities reference the existing entities which will create circular import issues. You need to:

**Option A: Update existing entities now**
1. Add relationships to existing entities (User, Business, Product, Order)
2. Import new entities in existing files

**Option B: Use forward references (temporary)**
```typescript
// Example in new entity
import type { User } from '../../users/entity/user.entity';

@ManyToOne(() => User)
user: User;
```

**Recommended**: Option A - Update existing entities to maintain clean architecture.

---

### **Step 2: Update Existing User Entity**

**File**: `src/core/users/entity/user.entity.ts`

**Changes Needed**:

1. **Remove wallet fields** (moved to Wallet entity):
```typescript
// ❌ REMOVE these columns:
// walletReference
// walletAccountNumber
// walletAccountName
// walletBankName
// walletBankCode
// paystackCustomerCode
// paystackDedicatedAccountId
// paystackAccountStatus
// paymentProvider
```

2. **Remove profile fields** (moved to UserProfile entity):
```typescript
// ❌ REMOVE these columns:
// firstName
// lastName
// phone
// profilePicture
```

3. **Remove KYC fields** (moved to UserKYC entity):
```typescript
// ❌ REMOVE these columns:
// bvn
// isPhoneVerified
```

4. **Remove security fields** (moved to UserSecurity entity):
```typescript
// ❌ REMOVE these columns:
// pin
// pinFailedAttempts
// pinLockedUntil
// deviceId
// latitude
// longitude
```

5. **Remove onboarding fields** (moved to UserOnboarding entity):
```typescript
// ❌ REMOVE these columns:
// onboardingStep
// isOnboardingCompleted
```

6. **Remove personal bank account fields** (moved to BankAccount entity):
```typescript
// ❌ REMOVE these columns:
// personalAccountNumber
// personalAccountName
// personalBankName
// personalBankCode
```

7. **Add relationships to new entities**:
```typescript
@OneToOne(() => UserProfile, (profile) => profile.user, { cascade: true })
profile: UserProfile;

@OneToOne(() => UserKYC, (kyc) => kyc.user, { cascade: true })
kyc: UserKYC;

@OneToOne(() => UserSecurity, (security) => security.user, { cascade: true })
security: UserSecurity;

@OneToOne(() => UserOnboarding, (onboarding) => onboarding.user, { cascade: true })
onboarding: UserOnboarding;

@OneToOne(() => Wallet, (wallet) => wallet.user)
wallet: Wallet;

@OneToMany(() => BankAccount, (account) => account.user)
bankAccounts: BankAccount[];
```

**Simplified User Entity Result**:
```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ type: 'enum', enum: UserType, default: UserType.USER })
  userType: UserType;

  @Column({ nullable: true })
  roleId: number;

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'roleId' })
  role: Role;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ type: 'text', nullable: true })
  statusReason: string;

  @Column({ type: 'timestamp', nullable: true })
  suspendedUntil: Date;

  @Column({ nullable: true })
  suspendedBy: number;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @Column({ length: 45, nullable: true })
  lastLoginIp: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  createdBy: number;

  // Relationships
  @OneToOne(() => UserProfile, (profile) => profile.user, { cascade: true })
  profile: UserProfile;

  @OneToOne(() => UserKYC, (kyc) => kyc.user, { cascade: true })
  kyc: UserKYC;

  @OneToOne(() => UserSecurity, (security) => security.user, { cascade: true })
  security: UserSecurity;

  @OneToOne(() => UserOnboarding, (onboarding) => onboarding.user, { cascade: true })
  onboarding: UserOnboarding;

  @OneToOne(() => Wallet, (wallet) => wallet.user)
  wallet: Wallet;

  @OneToOne(() => Business, (business) => business.user)
  business: Business;

  @OneToMany(() => BankAccount, (account) => account.user)
  bankAccounts: BankAccount[];

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @OneToMany(() => Review, (review) => review.user)
  reviews: Review[];
}
```

---

### **Step 3: Update Existing Business Entity**

**File**: `src/core/businesses/business.entity.ts`

**Changes Needed**:

1. **Remove payment account fields** (moved to BusinessPaymentAccount entity):
```typescript
// ❌ REMOVE these columns:
// paystackSubaccountCode
// isSubaccountActive
```

2. **Remove settlement config fields** (moved to BusinessSettlementConfig entity):
```typescript
// ❌ REMOVE these columns:
// settlementSchedule
```

3. **Keep revenue share percentage** (it's a business policy, belongs here)

4. **Add relationships**:
```typescript
@OneToOne(() => BusinessPaymentAccount, (account) => account.business, { cascade: true })
paymentAccount: BusinessPaymentAccount;

@OneToOne(() => BusinessSettlementConfig, (config) => config.business, { cascade: true })
settlementConfig: BusinessSettlementConfig;

@OneToMany(() => Settlement, (settlement) => settlement.business)
settlements: Settlement[];

@OneToMany(() => Coupon, (coupon) => coupon.business)
coupons: Coupon[];
```

---

### **Step 4: Update Existing Product Entity**

**File**: `src/core/product/entity/product.entity.ts`

**Changes Needed**:

1. **Remove inventory fields** (moved to ProductVariant):
```typescript
// ❌ REMOVE these columns:
// quantityInStock
```

2. **Remove variation fields** (moved to ProductVariant):
```typescript
// ❌ REMOVE these columns:
// hasVariation
// colors
```

3. **Remove images array** (moved to ProductImage entity):
```typescript
// ❌ REMOVE this column:
// images: string[]
```

4. **Rename price to basePrice**:
```typescript
// BEFORE:
@Column({ type: 'decimal', precision: 10, scale: 2 })
price: number;

// AFTER:
@Column({ type: 'decimal', precision: 10, scale: 2 })
basePrice: number;
```

5. **Add hasVariants flag**:
```typescript
@Column({ default: false })
hasVariants: boolean;
```

6. **Add defaultVariantId**:
```typescript
@Column({ nullable: true })
defaultVariantId: number;
```

7. **Add relationships**:
```typescript
@OneToMany(() => ProductVariant, (variant) => variant.product, { cascade: true })
variants: ProductVariant[];

@OneToMany(() => ProductImage, (image) => image.product, { cascade: true })
images: ProductImage[];

@OneToMany(() => InventoryLog, (log) => log.product)
inventoryLogs: InventoryLog[];

@OneToMany(() => Review, (review) => review.product)
reviews: Review[];
```

---

### **Step 5: Update Existing Order Entity**

**File**: `src/core/order/entity/order.entity.ts`

**Changes Needed**:

1. **Remove JSON columns**:
```typescript
// ❌ REMOVE these columns:
// paymentDetails: JSON
// deliveryDetails: JSON
// settlementDetails: JSON
// refundDetails: JSON
// statusHistory: JSON
```

2. **Remove payment fields** (moved to OrderPayment):
```typescript
// ❌ REMOVE these columns:
// transactionReference
// paymentDate
// paymentStatus
// paymentMethod
```

3. **Remove settlement fields** (moved to Settlement):
```typescript
// ❌ REMOVE these columns:
// isBusinessSettled
// settlementReference
// settlementDate
```

4. **Remove refund fields** (moved to OrderRefund):
```typescript
// ❌ REMOVE these columns:
// isRefunded
// refundedAmount
// refundReference
// refundDate
```

5. **Remove guest flag** (replaced by customerProfileId):
```typescript
// ❌ REMOVE this column:
// isGuestOrder
```

6. **Remove customer fields** (moved to CustomerProfile + Address):
```typescript
// ❌ REMOVE these columns:
// customerName
// customerEmail
// customerPhoneNumber
// deliveryAddress
// state
// city
```

7. **Add new fields**:
```typescript
@Column()
customerProfileId: number;

@ManyToOne(() => CustomerProfile, (profile) => profile.orders)
@JoinColumn({ name: 'customerProfileId' })
customerProfile: CustomerProfile;

@Column()
shippingAddressId: number;

@ManyToOne(() => Address)
@JoinColumn({ name: 'shippingAddressId' })
shippingAddress: Address;

@Column({ nullable: true })
couponId: number;

@ManyToOne(() => Coupon)
@JoinColumn({ name: 'couponId' })
coupon: Coupon;
```

8. **Add relationships**:
```typescript
@OneToMany(() => OrderStatusHistory, (history) => history.order, { cascade: true })
statusHistory: OrderStatusHistory[];

@OneToOne(() => OrderPayment, (payment) => payment.order, { cascade: true })
payment: OrderPayment;

@OneToMany(() => OrderShipment, (shipment) => shipment.order, { cascade: true })
shipments: OrderShipment[];

@OneToMany(() => OrderRefund, (refund) => refund.order, { cascade: true })
refunds: OrderRefund[];

@OneToOne(() => Settlement, (settlement) => settlement.order)
settlement: Settlement;
```

---

### **Step 6: Update OrderItem Entity**

**File**: `src/core/order/entity/order-items.entity.ts`

**Changes Needed**:

1. **Add variantId field**:
```typescript
@Column()
variantId: number;

@ManyToOne(() => ProductVariant)
@JoinColumn({ name: 'variantId' })
variant: ProductVariant;
```

2. **Add SKU and variant name snapshots**:
```typescript
@Column({ length: 100, nullable: true })
sku: string;

@Column({ length: 255, nullable: true })
variantName: string;
```

3. **Rename price to unitPrice**:
```typescript
// BEFORE:
@Column({ type: 'decimal', precision: 10, scale: 2 })
price: number;

// AFTER:
@Column({ type: 'decimal', precision: 10, scale: 2 })
unitPrice: number;
```

4. **Remove imageUrls array, add single imageUrl**:
```typescript
// BEFORE:
@Column('simple-array')
imageUrls: string[];

// AFTER:
@Column({ type: 'text', nullable: true })
imageUrl: string;
```

---

### **Step 7: Create Database Migrations**

Generate migrations for all schema changes:

```bash
# Generate migration for user domain changes
npm run typeorm migration:generate -- -n UserDomainSeparation

# Generate migration for wallet separation
npm run typeorm migration:generate -- -n WalletEntityCreation

# Generate migration for order domain changes
npm run typeorm migration:generate -- -n OrderDomainSeparation

# Generate migration for product variants
npm run typeorm migration:generate -- -n ProductVariantsRefactoring

# Generate migration for cart system
npm run typeorm migration:generate -- -n CartSystem

# Generate migration for coupon system
npm run typeorm migration:generate -- -n CouponSystem

# Generate migration for customer profiles
npm run typeorm migration:generate -- -n CustomerProfiles

# Generate migration for email queue
npm run typeorm migration:generate -- -n EmailQueue

# Generate migration for audit logs
npm run typeorm migration:generate -- -n AuditLogs
```

---

### **Step 8: Data Migration Scripts**

Create data migration scripts to populate new tables from existing data:

**Example: Migrate User wallet data to Wallet entity**

```typescript
// src/migrations/data/migrate-user-wallets.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateUserWallets implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO wallets (
        "userId",
        provider,
        "providerCustomerId",
        "providerAccountId",
        "accountNumber",
        "accountName",
        "bankName",
        "bankCode",
        status,
        currency,
        "createdAt",
        "updatedAt"
      )
      SELECT
        id,
        'PAYSTACK'::payment_provider_enum,
        "paystackCustomerCode",
        "paystackDedicatedAccountId",
        "walletAccountNumber",
        "walletAccountName",
        "walletBankName",
        "walletBankCode",
        CASE
          WHEN "paystackAccountStatus" = 'ACTIVE' THEN 'ACTIVE'::wallet_status_enum
          ELSE 'PENDING'::wallet_status_enum
        END,
        'NGN',
        NOW(),
        NOW()
      FROM users
      WHERE "walletAccountNumber" IS NOT NULL
      ON CONFLICT ("userId") DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM wallets`);
  }
}
```

---

### **Step 9: Update Service Layer**

Update all services to use new entity structure:

**Priority Services to Update**:
1. **UsersService** - Split into multiple services
2. **OrderService** - Refactor to use OrderPayment, OrderShipment, etc.
3. **ProductService** - Update for variants
4. **Create new services**: CartService, CouponService, EmailQueueService

**Example: Update UsersService for separated entities**

```typescript
// Before
async createUser(dto: CreateUserDto) {
  const user = this.userRepository.create({
    email: dto.email,
    password: hashedPassword,
    firstName: dto.firstName,  // ❌ No longer in User
    lastName: dto.lastName,    // ❌ No longer in User
    phone: dto.phone,          // ❌ No longer in User
  });
  return this.userRepository.save(user);
}

// After
async createUser(dto: CreateUserDto) {
  // Create user (auth only)
  const user = this.userRepository.create({
    email: dto.email,
    password: hashedPassword,
  });
  await this.userRepository.save(user);

  // Create profile
  const profile = this.profileRepository.create({
    userId: user.id,
    firstName: dto.firstName,
    lastName: dto.lastName,
    phone: dto.phone,
  });
  await this.profileRepository.save(profile);

  // Create onboarding tracker
  const onboarding = this.onboardingRepository.create({
    userId: user.id,
    currentStep: OnboardingStep.PHONE_VERIFICATION,
  });
  await this.onboardingRepository.save(onboarding);

  return user;
}
```

---

### **Step 10: Update DTOs**

Update all DTOs to match new entity structure:

**Example: Update UserResponseDto**

```typescript
// Before
export class UserResponseDto {
  id: number;
  email: string;
  firstName: string;  // ❌ No longer in User
  lastName: string;   // ❌ No longer in User
  phone: string;      // ❌ No longer in User
}

// After
export class UserResponseDto {
  id: number;
  email: string;
  status: UserStatus;

  profile?: {
    firstName: string;
    lastName: string;
    phone: string;
    profilePicture?: string;
  };

  kyc?: {
    status: KYCStatus;
    verifiedAt?: Date;
  };

  onboarding?: {
    currentStep: OnboardingStep;
    isCompleted: boolean;
    progressPercentage: number;
  };

  wallet?: {
    accountNumber: string;
    accountName: string;
    bankName: string;
    availableBalance: number;
  };
}
```

---

### **Step 11: Testing**

Create comprehensive tests:

1. **Unit Tests**:
   - Entity validation tests
   - Service method tests
   - DTO validation tests

2. **Integration Tests**:
   - User registration flow
   - Order creation flow
   - Payment webhook processing
   - Cart management
   - Coupon application

3. **E2E Tests**:
   - Complete guest checkout flow
   - Complete registered user flow
   - Business onboarding flow
   - Settlement flow

---

### **Step 12: Remove Monnify**

Follow the `MONNIFY_REMOVAL_PLAN.md` document step-by-step.

---

## Deployment Strategy

### **Phase 1: Database Schema Migration (Low Risk)**
1. Deploy new entity tables (non-breaking, additive only)
2. Run data migration scripts
3. Verify data integrity

### **Phase 2: Service Layer Updates (Medium Risk)**
1. Deploy updated services with fallback logic
2. Feature flag new entity usage
3. Monitor error rates

### **Phase 3: Remove Old Columns (High Risk)**
1. Deprecate old columns (keep for 1-2 weeks)
2. Monitor for any remaining usage
3. Drop old columns in final migration

### **Phase 4: Monnify Removal (Medium Risk)**
1. Follow Monnify removal plan
2. Full regression testing
3. Monitor production closely

---

## Rollback Plan

If issues arise:

1. **Schema rollback**: Run down() migrations in reverse order
2. **Service rollback**: Revert to previous deployment
3. **Data restore**: Restore from database backup

---

## Success Metrics

Track these metrics post-deployment:

- ✅ Zero data loss
- ✅ Query performance improved by 50%+
- ✅ All existing features working
- ✅ Cart abandonment rate < 70%
- ✅ Email delivery rate > 95%
- ✅ No Monnify references in codebase
- ✅ Audit logs capturing 100% of critical actions

---

## Next Steps (Immediate Actions)

1. **Fix circular dependencies** in new entity files
2. **Update existing User entity** as outlined in Step 2
3. **Create first migration** for User domain separation
4. **Update UsersService** to use new entities
5. **Test user registration flow** end-to-end
6. **Repeat for other domains** (Business, Product, Order)

---

**Generated**: 2025-12-26
**Status**: Ready for Implementation
**Estimated Timeline**: 6-8 weeks for complete migration
