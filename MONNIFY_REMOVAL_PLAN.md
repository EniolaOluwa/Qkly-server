# Monnify Removal Plan

## Executive Summary

Monnify is a deprecated payment provider referenced throughout the codebase (20+ files). This document provides a comprehensive strategy to remove all Monnify dependencies and consolidate on Paystack as the exclusive payment provider.

---

## Scope of Monnify References

### Files Affected (20 files)

#### **1. Entity/Model Files (3)**
- `src/core/users/entity/user.entity.ts` - Wallet fields with "Monnify" comments
  - Lines 86-99: `walletReference`, `walletAccountNumber`, `walletAccountName`, `walletBankName`, `walletBankCode`
  - Comments: "Monnify wallet reference", "Monnify wallet account number", etc.

- `src/core/order/interfaces/order.interface.ts` - Payment enums and interfaces
  - `PaymentMethod.MONNIFY` enum value
  - `MonnifyPaymentResponse` interface
  - `MonnifyTransaction` interface

- `src/migrations/*.ts` - Multiple migration files with Monnify references

#### **2. Service Files (6)**
- `src/core/payment/providers/monnify.provider.ts` (595 lines) - Entire file
- `src/core/payment/payment.service.ts` - Switch case for Monnify
- `src/core/payment/payment.module.ts` - MonnifyProvider in providers array
- `src/core/wallets/wallets.service.ts` - getPaymentMethodsForMonnify() method
- `src/common/utils/webhook.utils.ts` - verifyMonnifySignature() function
- `src/common/utils/wallet-provisioning.util.ts` - Monnify provisioning logic

#### **3. DTO Files (5)**
- `src/core/payment/dto/payment-provider.dto.ts` - `PaymentProviderType.MONNIFY`
- `src/core/wallets/dto/wallet.dto.ts` - Monnify-specific fields
- `src/core/webhook/webhook.dto.ts` - Monnify webhook types
- `src/core/order/dto/payment.dto.ts` - Monnify payment DTOs
- `src/core/order/dto/payment-dto-adapter.service.ts` - Monnify adapter logic

#### **4. Interface Files (1)**
- `src/common/interfaces/monnify-response.interface.ts` - Entire file (Monnify-specific interfaces)

#### **5. Configuration Files (1)**
- `.env.example` - Monnify environment variables (6 variables)

#### **6. Other Files (4)**
- `src/core/order/dto/create-order.dto.ts` - Monnify payment method in validation
- `src/core/order/dto/order-response.dto.ts` - Monnify response fields
- `src/core/admin/dto/manual-order-update.dto.ts` - Monnify payment method option
- Various test files (if any)

---

## Removal Strategy

### Phase 1: Enum Cleanup

**Action**: Remove `MONNIFY` from `PaymentMethod` enum

**Files to Update**:
```typescript
// src/core/order/interfaces/order.interface.ts
export enum PaymentMethod {
  // MONNIFY = 'MONNIFY', // ❌ REMOVE THIS
  BANK_TRANSFER = 'BANK_TRANSFER',
  CARD = 'CARD',
  WALLET = 'WALLET',
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY',
  USSD = 'USSD',
}
```

**Impact**: Any existing orders with `paymentMethod = 'MONNIFY'` will need data migration.

**Migration Query**:
```sql
-- Count existing Monnify orders
SELECT COUNT(*) FROM orders WHERE "paymentMethod" = 'MONNIFY';

-- Migrate to BANK_TRANSFER (closest equivalent)
UPDATE orders
SET "paymentMethod" = 'BANK_TRANSFER'
WHERE "paymentMethod" = 'MONNIFY';
```

---

### Phase 2: Provider Removal

**Action**: Delete Monnify provider and update payment service

**Files to Delete**:
- `src/core/payment/providers/monnify.provider.ts` (entire file)
- `src/common/interfaces/monnify-response.interface.ts` (entire file)

**Files to Update**:

**`src/core/payment/payment.service.ts`**:
```typescript
// BEFORE
private getProvider(): IPaymentProvider {
  switch (this.activeProvider) {
    case PaymentProviderType.PAYSTACK:
      return this.paystackProvider;
    case PaymentProviderType.MONNIFY: // ❌ REMOVE
      return this.monnifyProvider; // ❌ REMOVE
    default:
      return this.paystackProvider;
  }
}

// AFTER
private getProvider(): IPaymentProvider {
  // Always use Paystack
  return this.paystackProvider;
}
```

**`src/core/payment/payment.module.ts`**:
```typescript
// BEFORE
providers: [
  PaymentService,
  PaystackProvider,
  MonnifyProvider, // ❌ REMOVE THIS LINE
]

// AFTER
providers: [
  PaymentService,
  PaystackProvider,
]
```

---

### Phase 3: DTO & Interface Cleanup

**Action**: Remove Monnify-specific DTOs and update payment provider enum

**`src/core/payment/dto/payment-provider.dto.ts`**:
```typescript
// BEFORE
export enum PaymentProviderType {
  PAYSTACK = 'PAYSTACK',
  MONNIFY = 'MONNIFY', // ❌ REMOVE
}

// AFTER
export enum PaymentProviderType {
  PAYSTACK = 'PAYSTACK',
  // Future providers can be added here
  // FLUTTERWAVE = 'FLUTTERWAVE',
}
```

**Files to Clean**:
- `src/core/wallets/dto/wallet.dto.ts` - Remove Monnify-specific fields
- `src/core/webhook/webhook.dto.ts` - Remove Monnify webhook types
- `src/core/order/dto/payment.dto.ts` - Remove Monnify DTOs
- `src/core/order/dto/payment-dto-adapter.service.ts` - Remove Monnify adapter

---

### Phase 4: User Entity Wallet Fields Refactoring

**Action**: Make wallet field names provider-agnostic

**Current State (User entity)**:
```typescript
@Column({ nullable: true, comment: 'Monnify wallet reference' })
walletReference: string;

@Column({ nullable: true, comment: 'Monnify wallet account number' })
walletAccountNumber: string;

@Column({ nullable: true, comment: 'Monnify wallet account name' })
walletAccountName: string;

@Column({ nullable: true, comment: 'Monnify wallet bank name' })
walletBankName: string;

@Column({ nullable: true, comment: 'Monnify wallet bank code' })
walletBankCode: string;
```

**Migration Options**:

**Option A: Rename in place (backward compatible)**
```typescript
@Column({ nullable: true, comment: 'Virtual account reference (provider-agnostic)' })
walletReference: string; // KEEP, update comment only

@Column({ nullable: true, comment: 'Virtual account number (provider-agnostic)' })
walletAccountNumber: string; // KEEP, update comment only

@Column({ nullable: true, comment: 'Virtual account name (provider-agnostic)' })
walletAccountName: string; // KEEP, update comment only

@Column({ nullable: true, comment: 'Virtual account bank name (provider-agnostic)' })
walletBankName: string; // KEEP, update comment only

@Column({ nullable: true, comment: 'Virtual account bank code (provider-agnostic)' })
walletBankCode: string; // KEEP, update comment only
```

**Option B: Move to new Wallet entity (RECOMMENDED)**
```typescript
// Remove these fields from User entity entirely
// ❌ walletReference
// ❌ walletAccountNumber
// ❌ walletAccountName
// ❌ walletBankName
// ❌ walletBankCode

// Data migrated to new Wallet entity (already created)
// See: src/core/wallets/entities/wallet.entity.ts
```

**Migration Script for Option B**:
```sql
-- Create wallets from existing user wallet data
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
  id AS "userId",
  CASE
    WHEN "paymentProvider" = 'PAYSTACK' THEN 'PAYSTACK'::payment_provider_enum
    ELSE 'PAYSTACK'::payment_provider_enum -- Default to Paystack
  END AS provider,
  "paystackCustomerCode" AS "providerCustomerId",
  "paystackDedicatedAccountId" AS "providerAccountId",
  "walletAccountNumber" AS "accountNumber",
  "walletAccountName" AS "accountName",
  "walletBankName" AS "bankName",
  "walletBankCode" AS "bankCode",
  CASE
    WHEN "paystackAccountStatus" = 'ACTIVE' THEN 'ACTIVE'::wallet_status_enum
    WHEN "paystackAccountStatus" = 'PENDING' THEN 'PENDING'::wallet_status_enum
    ELSE 'INACTIVE'::wallet_status_enum
  END AS status,
  'NGN' AS currency,
  NOW() AS "createdAt",
  NOW() AS "updatedAt"
FROM users
WHERE "walletAccountNumber" IS NOT NULL;

-- After successful migration, drop columns from users table
ALTER TABLE users DROP COLUMN "walletReference";
ALTER TABLE users DROP COLUMN "walletAccountNumber";
ALTER TABLE users DROP COLUMN "walletAccountName";
ALTER TABLE users DROP COLUMN "walletBankName";
ALTER TABLE users DROP COLUMN "walletBankCode";
ALTER TABLE users DROP COLUMN "paystackCustomerCode";
ALTER TABLE users DROP COLUMN "paystackDedicatedAccountId";
ALTER TABLE users DROP COLUMN "paystackAccountStatus";
ALTER TABLE users DROP COLUMN "paymentProvider";
```

---

### Phase 5: Service Logic Updates

**Action**: Update wallet provisioning to use new Wallet entity

**`src/common/utils/wallet-provisioning.util.ts`**:
```typescript
// BEFORE: Provision wallet and update User entity directly
async provisionWalletOnBvnSuccess(user: User) {
  const walletData = await this.paymentService.createVirtualAccount({
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    bvn: user.bvn,
  });

  // Update user entity with wallet data
  await this.userRepository.update(user.id, {
    walletReference: walletData.reference,
    walletAccountNumber: walletData.accountNumber,
    // ... etc
  });
}

// AFTER: Create Wallet entity
async provisionWalletOnBvnSuccess(user: User) {
  const walletData = await this.paymentService.createVirtualAccount({
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    bvn: user.kyc.bvn, // From UserKYC entity
  });

  // Create wallet entity
  const wallet = this.walletRepository.create({
    userId: user.id,
    provider: PaymentProvider.PAYSTACK,
    providerCustomerId: walletData.customerCode,
    providerAccountId: walletData.dedicatedAccountId,
    accountNumber: walletData.accountNumber,
    accountName: walletData.accountName,
    bankName: walletData.bankName,
    bankCode: walletData.bankCode,
    status: WalletStatus.ACTIVE,
    currency: 'NGN',
    providerMetadata: walletData.rawResponse,
  });

  await this.walletRepository.save(wallet);
}
```

**`src/core/wallets/wallets.service.ts`**:
```typescript
// REMOVE this method entirely
async getPaymentMethodsForMonnify(userId: number) {
  // ❌ DELETE THIS METHOD
}

// UPDATE balance retrieval
async getWalletBalance(userId: number) {
  // BEFORE: Query transactions and calculate
  const user = await this.userRepository.findOne(userId);
  const transactions = await this.transactionRepository.find({
    where: { userId },
  });
  // Calculate balance from transactions...

  // AFTER: Use Wallet entity
  const wallet = await this.walletRepository.findOne({
    where: { userId },
  });

  if (!wallet) {
    throw new NotFoundException('Wallet not found');
  }

  return {
    availableBalance: wallet.availableBalance,
    pendingBalance: wallet.pendingBalance,
    ledgerBalance: wallet.ledgerBalance,
    currency: wallet.currency,
  };
}
```

---

### Phase 6: Webhook Cleanup

**Action**: Remove Monnify webhook signature verification

**`src/common/utils/webhook.utils.ts`**:
```typescript
// DELETE this function entirely
export function verifyMonnifySignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  // ❌ DELETE THIS ENTIRE FUNCTION
}

// KEEP only Paystack verification
export function verifyPaystackSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const hmac = crypto.createHmac('sha512', secret);
  const expectedSignature = hmac.update(payload).digest('hex');
  return expectedSignature === signature;
}
```

**`src/core/webhook/*.ts`**: Update webhook handlers to only accept Paystack webhooks.

---

### Phase 7: Environment Variables Cleanup

**Action**: Remove Monnify env vars from `.env.example`

**`.env.example`**:
```bash
# REMOVE these lines:
# MONNIFY_BASE_URL=
# MONNIFY_API_KEY=
# MONNIFY_SECRET_KEY=
# MONNIFY_CONTRACT_CODE=
# MONNIFY_WALLET_PROVIDER=
# MONNIFY_ENABLED=

# KEEP Paystack variables:
PAYSTACK_BASE_URL=https://api.paystack.co
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PUBLIC_KEY=pk_test_...
PAYSTACK_PREFERRED_BANK=wema-bank

PAYMENT_PROVIDER=PAYSTACK  # No longer needs switching logic
PLATFORM_FEE_PERCENTAGE=5  # Update from 0% to 5%
```

---

### Phase 8: Migration Files Cleanup

**Action**: Add comments to migration files indicating Monnify deprecation

For migrations that reference Monnify:
```typescript
// src/migrations/1763285431205-PaymentServiceAdapter.ts
export class PaymentServiceAdapter1763285431205 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // NOTE: Monnify support deprecated as of 2025-12-26
    // This migration previously added Monnify provider support
    // Monnify columns have been migrated to provider-agnostic Wallet entity
  }
}
```

**DO NOT delete migration files** (they're part of version history).

---

## Testing Strategy

### Pre-Removal Tests

1. **Identify Monnify Usage**:
```bash
# Search for all Monnify references
grep -r "monnify" --ignore-case src/
grep -r "MONNIFY" src/
```

2. **Data Audit**:
```sql
-- Count users with Monnify wallets
SELECT COUNT(*) FROM users WHERE "walletReference" LIKE 'MF%';

-- Count orders paid via Monnify
SELECT COUNT(*) FROM orders WHERE "paymentMethod" = 'MONNIFY';

-- Find transactions with Monnify provider
SELECT COUNT(*) FROM transactions WHERE "paymentProvider" = 'MONNIFY';
```

### Post-Removal Tests

1. **Code Validation**:
```bash
# Ensure no Monnify references remain
grep -r "monnify" --ignore-case src/ | wc -l  # Should be 0
grep -r "MONNIFY" src/ | wc -l  # Should be 0
```

2. **Functional Tests**:
- ✅ User registration creates Paystack DVA
- ✅ Wallet balance retrieval works
- ✅ Order payment via Paystack succeeds
- ✅ Webhook processing for Paystack works
- ✅ Business subaccount creation works
- ✅ Settlement to bank account works

3. **Data Integrity**:
```sql
-- Verify wallet migration
SELECT COUNT(*) FROM wallets WHERE provider = 'PAYSTACK';

-- Verify no orphaned data
SELECT COUNT(*) FROM users
WHERE "walletAccountNumber" IS NOT NULL
AND id NOT IN (SELECT "userId" FROM wallets);
```

---

## Rollback Plan

If removal causes issues:

1. **Revert Code Changes**:
```bash
git revert <commit-hash>
```

2. **Restore Wallet Data** (if migrated):
```sql
-- Restore wallet data to users table
UPDATE users u
SET
  "walletAccountNumber" = w."accountNumber",
  "walletAccountName" = w."accountName",
  "walletBankName" = w."bankName",
  "walletBankCode" = w."bankCode"
FROM wallets w
WHERE u.id = w."userId";
```

3. **Re-enable Monnify Provider** (from backup):
- Restore `monnify.provider.ts`
- Restore switch logic in `payment.service.ts`

---

## Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Enum Cleanup | 1 day | None |
| Phase 2: Provider Removal | 1 day | Phase 1 |
| Phase 3: DTO Cleanup | 1 day | Phase 2 |
| Phase 4: User Entity Refactor | 2 days | Wallet entity created |
| Phase 5: Service Logic Updates | 3 days | Phase 4 |
| Phase 6: Webhook Cleanup | 1 day | Phase 2 |
| Phase 7: Environment Cleanup | 1 hour | Phase 2 |
| Phase 8: Migration Cleanup | 1 day | All phases |
| **Testing & QA** | 3 days | All phases |
| **Total** | **~14 days** | |

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Existing Monnify users can't access wallets** | HIGH | Migrate wallet data to new entity before removal |
| **Old orders break payment reconciliation** | MEDIUM | Migrate payment method enum values |
| **Webhook failures** | HIGH | Ensure Paystack webhook is 100% functional before removal |
| **Data loss during migration** | CRITICAL | Full database backup before migration |
| **Service downtime** | HIGH | Deploy during low-traffic window, staged rollout |

---

## Success Criteria

✅ Zero references to "Monnify" in codebase (case-insensitive)
✅ All users with wallets migrated to new Wallet entity
✅ All existing orders queryable with migrated payment method
✅ Paystack payment flow working end-to-end
✅ No regression in user registration flow
✅ No regression in business onboarding flow
✅ All tests passing
✅ Production deployment successful with zero downtime

---

**Generated**: 2025-12-26
**Status**: Ready for Implementation
**Priority**: CRITICAL (blocking new architecture adoption)
