import { MigrationInterface, QueryRunner } from 'typeorm';

export class DatabaseRedesignPart2RemoveColumns1766706561000 implements MigrationInterface {
  name = 'DatabaseRedesignPart2RemoveColumns1766706561000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================================
    // PART 2: REMOVE REDUNDANT COLUMNS & ADD FOREIGN KEYS
    // ========================================

    // ========== USERS TABLE ==========
    // Remove columns moved to user_profiles
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "firstName"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "lastName"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "phone"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "profile_picture"`);

    // Remove columns moved to user_kyc
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "bvn"`);

    // Remove columns moved to user_security
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "pin"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "pinFailedAttempts"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "pinLockedUntil"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "lastLoginAt"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "lastLoginIp"`);

    // Remove columns moved to user_onboarding
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "onboardingStep"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "isOnboardingCompleted"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "deviceId"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "longitude"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "latitude"`);

    // Remove columns moved to wallets
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "walletReference"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "walletAccountNumber"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "walletAccountName"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "walletBankName"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "walletBankCode"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "paystackCustomerCode"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "paystackDedicatedAccountId"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "paystackAccountStatus"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "paymentProvider"`);

    // Remove columns moved to bank_accounts
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "personalAccountNumber"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "personalAccountName"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "personalBankName"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "personalBankCode"`);

    // ========== BUSINESSES TABLE ==========
    // Remove columns moved to business_payment_accounts
    await queryRunner.query(`ALTER TABLE "businesses" DROP COLUMN IF EXISTS "paystackSubaccountCode"`);
    await queryRunner.query(`ALTER TABLE "businesses" DROP COLUMN IF EXISTS "revenueSharePercentage"`);
    await queryRunner.query(`ALTER TABLE "businesses" DROP COLUMN IF EXISTS "isSubaccountActive"`);

    // Remove columns moved to business_settlement_configs
    await queryRunner.query(`ALTER TABLE "businesses" DROP COLUMN IF EXISTS "settlementSchedule"`);

    // ========== ORDERS TABLE ==========
    // Remove columns moved to order_payments
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "paymentDate"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "paymentDetails"`);

    // Remove columns moved to order_shipments
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "estimatedDeliveryDate"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "deliveryDate"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "deliveryDetails"`);

    // Remove columns moved to settlements
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "isBusinessSettled"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "settlementReference"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "settlementDate"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "settlementDetails"`);

    // Remove columns moved to order_refunds
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "isRefunded"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "refundedAmount"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "refundReference"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "refundDate"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "refundDetails"`);

    // Remove JSON statusHistory (moved to order_status_history table)
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "statusHistory"`);

    // ========== ADD FOREIGN KEYS ==========

    // User-related foreign keys
    await queryRunner.query(`
      ALTER TABLE "user_profiles"
      ADD CONSTRAINT "FK_user_profiles_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "user_kyc"
      ADD CONSTRAINT "FK_user_kyc_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "user_security"
      ADD CONSTRAINT "FK_user_security_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "user_onboarding"
      ADD CONSTRAINT "FK_user_onboarding_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "wallets"
      ADD CONSTRAINT "FK_wallets_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "bank_accounts"
      ADD CONSTRAINT "FK_bank_accounts_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE
    `);

    // Business-related foreign keys
    await queryRunner.query(`
      ALTER TABLE "business_payment_accounts"
      ADD CONSTRAINT "FK_business_payment_accounts_businessId"
      FOREIGN KEY ("businessId") REFERENCES "businesses"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "business_settlement_configs"
      ADD CONSTRAINT "FK_business_settlement_configs_businessId"
      FOREIGN KEY ("businessId") REFERENCES "businesses"("id")
      ON DELETE CASCADE
    `);

    // Product-related foreign keys
    await queryRunner.query(`
      ALTER TABLE "product_variants"
      ADD CONSTRAINT "FK_product_variants_productId"
      FOREIGN KEY ("productId") REFERENCES "products"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "product_images"
      ADD CONSTRAINT "FK_product_images_productId"
      FOREIGN KEY ("productId") REFERENCES "products"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "inventory_logs"
      ADD CONSTRAINT "FK_inventory_logs_productId"
      FOREIGN KEY ("productId") REFERENCES "products"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "inventory_logs"
      ADD CONSTRAINT "FK_inventory_logs_variantId"
      FOREIGN KEY ("variantId") REFERENCES "product_variants"("id")
      ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "stock_reservations"
      ADD CONSTRAINT "FK_stock_reservations_productId"
      FOREIGN KEY ("productId") REFERENCES "products"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "stock_reservations"
      ADD CONSTRAINT "FK_stock_reservations_variantId"
      FOREIGN KEY ("variantId") REFERENCES "product_variants"("id")
      ON DELETE SET NULL
    `);

    // Order-related foreign keys
    await queryRunner.query(`
      ALTER TABLE "order_status_history"
      ADD CONSTRAINT "FK_order_status_history_orderId"
      FOREIGN KEY ("orderId") REFERENCES "orders"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "order_payments"
      ADD CONSTRAINT "FK_order_payments_orderId"
      FOREIGN KEY ("orderId") REFERENCES "orders"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "order_shipments"
      ADD CONSTRAINT "FK_order_shipments_orderId"
      FOREIGN KEY ("orderId") REFERENCES "orders"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "order_refunds"
      ADD CONSTRAINT "FK_order_refunds_orderId"
      FOREIGN KEY ("orderId") REFERENCES "orders"("id")
      ON DELETE CASCADE
    `);

    // Settlement foreign keys
    await queryRunner.query(`
      ALTER TABLE "settlements"
      ADD CONSTRAINT "FK_settlements_businessId"
      FOREIGN KEY ("businessId") REFERENCES "businesses"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "settlements"
      ADD CONSTRAINT "FK_settlements_orderId"
      FOREIGN KEY ("orderId") REFERENCES "orders"("id")
      ON DELETE SET NULL
    `);

    // Cart foreign keys
    await queryRunner.query(`
      ALTER TABLE "carts"
      ADD CONSTRAINT "FK_carts_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "cart_items"
      ADD CONSTRAINT "FK_cart_items_cartId"
      FOREIGN KEY ("cartId") REFERENCES "carts"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "cart_items"
      ADD CONSTRAINT "FK_cart_items_productId"
      FOREIGN KEY ("productId") REFERENCES "products"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "cart_items"
      ADD CONSTRAINT "FK_cart_items_variantId"
      FOREIGN KEY ("variantId") REFERENCES "product_variants"("id")
      ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "cart_abandonments"
      ADD CONSTRAINT "FK_cart_abandonments_cartId"
      FOREIGN KEY ("cartId") REFERENCES "carts"("id")
      ON DELETE CASCADE
    `);

    // Coupon foreign keys
    await queryRunner.query(`
      ALTER TABLE "coupons"
      ADD CONSTRAINT "FK_coupons_businessId"
      FOREIGN KEY ("businessId") REFERENCES "businesses"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "coupon_usages"
      ADD CONSTRAINT "FK_coupon_usages_couponId"
      FOREIGN KEY ("couponId") REFERENCES "coupons"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "coupon_usages"
      ADD CONSTRAINT "FK_coupon_usages_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "coupon_usages"
      ADD CONSTRAINT "FK_coupon_usages_orderId"
      FOREIGN KEY ("orderId") REFERENCES "orders"("id")
      ON DELETE CASCADE
    `);

    // Customer foreign keys
    await queryRunner.query(`
      ALTER TABLE "customer_profiles"
      ADD CONSTRAINT "FK_customer_profiles_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "addresses"
      ADD CONSTRAINT "FK_addresses_customerId"
      FOREIGN KEY ("customerId") REFERENCES "customer_profiles"("id")
      ON DELETE CASCADE
    `);

    // Email queue foreign key
    await queryRunner.query(`
      ALTER TABLE "email_logs"
      ADD CONSTRAINT "FK_email_logs_emailQueueId"
      FOREIGN KEY ("emailQueueId") REFERENCES "email_queue"("id")
      ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove foreign keys (in reverse order)
    await queryRunner.query(`ALTER TABLE "email_logs" DROP CONSTRAINT IF EXISTS "FK_email_logs_emailQueueId"`);
    await queryRunner.query(`ALTER TABLE "addresses" DROP CONSTRAINT IF EXISTS "FK_addresses_customerId"`);
    await queryRunner.query(`ALTER TABLE "customer_profiles" DROP CONSTRAINT IF EXISTS "FK_customer_profiles_userId"`);
    await queryRunner.query(`ALTER TABLE "coupon_usages" DROP CONSTRAINT IF EXISTS "FK_coupon_usages_orderId"`);
    await queryRunner.query(`ALTER TABLE "coupon_usages" DROP CONSTRAINT IF EXISTS "FK_coupon_usages_userId"`);
    await queryRunner.query(`ALTER TABLE "coupon_usages" DROP CONSTRAINT IF EXISTS "FK_coupon_usages_couponId"`);
    await queryRunner.query(`ALTER TABLE "coupons" DROP CONSTRAINT IF EXISTS "FK_coupons_businessId"`);
    await queryRunner.query(`ALTER TABLE "cart_abandonments" DROP CONSTRAINT IF EXISTS "FK_cart_abandonments_cartId"`);
    await queryRunner.query(`ALTER TABLE "cart_items" DROP CONSTRAINT IF EXISTS "FK_cart_items_variantId"`);
    await queryRunner.query(`ALTER TABLE "cart_items" DROP CONSTRAINT IF EXISTS "FK_cart_items_productId"`);
    await queryRunner.query(`ALTER TABLE "cart_items" DROP CONSTRAINT IF EXISTS "FK_cart_items_cartId"`);
    await queryRunner.query(`ALTER TABLE "carts" DROP CONSTRAINT IF EXISTS "FK_carts_userId"`);
    await queryRunner.query(`ALTER TABLE "settlements" DROP CONSTRAINT IF EXISTS "FK_settlements_orderId"`);
    await queryRunner.query(`ALTER TABLE "settlements" DROP CONSTRAINT IF EXISTS "FK_settlements_businessId"`);
    await queryRunner.query(`ALTER TABLE "order_refunds" DROP CONSTRAINT IF EXISTS "FK_order_refunds_orderId"`);
    await queryRunner.query(`ALTER TABLE "order_shipments" DROP CONSTRAINT IF EXISTS "FK_order_shipments_orderId"`);
    await queryRunner.query(`ALTER TABLE "order_payments" DROP CONSTRAINT IF EXISTS "FK_order_payments_orderId"`);
    await queryRunner.query(`ALTER TABLE "order_status_history" DROP CONSTRAINT IF EXISTS "FK_order_status_history_orderId"`);
    await queryRunner.query(`ALTER TABLE "stock_reservations" DROP CONSTRAINT IF EXISTS "FK_stock_reservations_variantId"`);
    await queryRunner.query(`ALTER TABLE "stock_reservations" DROP CONSTRAINT IF EXISTS "FK_stock_reservations_productId"`);
    await queryRunner.query(`ALTER TABLE "inventory_logs" DROP CONSTRAINT IF EXISTS "FK_inventory_logs_variantId"`);
    await queryRunner.query(`ALTER TABLE "inventory_logs" DROP CONSTRAINT IF EXISTS "FK_inventory_logs_productId"`);
    await queryRunner.query(`ALTER TABLE "product_images" DROP CONSTRAINT IF EXISTS "FK_product_images_productId"`);
    await queryRunner.query(`ALTER TABLE "product_variants" DROP CONSTRAINT IF EXISTS "FK_product_variants_productId"`);
    await queryRunner.query(`ALTER TABLE "business_settlement_configs" DROP CONSTRAINT IF EXISTS "FK_business_settlement_configs_businessId"`);
    await queryRunner.query(`ALTER TABLE "business_payment_accounts" DROP CONSTRAINT IF EXISTS "FK_business_payment_accounts_businessId"`);
    await queryRunner.query(`ALTER TABLE "bank_accounts" DROP CONSTRAINT IF EXISTS "FK_bank_accounts_userId"`);
    await queryRunner.query(`ALTER TABLE "wallets" DROP CONSTRAINT IF EXISTS "FK_wallets_userId"`);
    await queryRunner.query(`ALTER TABLE "user_onboarding" DROP CONSTRAINT IF EXISTS "FK_user_onboarding_userId"`);
    await queryRunner.query(`ALTER TABLE "user_security" DROP CONSTRAINT IF EXISTS "FK_user_security_userId"`);
    await queryRunner.query(`ALTER TABLE "user_kyc" DROP CONSTRAINT IF EXISTS "FK_user_kyc_userId"`);
    await queryRunner.query(`ALTER TABLE "user_profiles" DROP CONSTRAINT IF EXISTS "FK_user_profiles_userId"`);

    // Note: Restoring dropped columns would require data migration
    // This is a destructive migration - data in removed columns will be lost
    // In production, you would need a data migration script to move data
    // from new tables back to old columns before running this down migration
  }
}
