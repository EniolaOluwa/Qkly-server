import { MigrationInterface, QueryRunner } from 'typeorm';

export class DatabaseRedesignPart1NewTables1766706560000 implements MigrationInterface {
  name = 'DatabaseRedesignPart1NewTables1766706560000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================================
    // PART 1: CREATE NEW TABLES
    // ========================================

    // User Profile Table
    await queryRunner.query(`
      CREATE TABLE "user_profiles" (
        "id" SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "firstName" character varying NOT NULL,
        "lastName" character varying NOT NULL,
        "phone" character varying(20) NOT NULL,
        "profilePicture" character varying,
        "deviceId" character varying,
        "longitude" double precision,
        "latitude" double precision,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_user_profiles_userId" UNIQUE ("userId"),
        CONSTRAINT "UQ_user_profiles_phone" UNIQUE ("phone"),
        CONSTRAINT "PK_user_profiles" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_profiles_userId" ON "user_profiles" ("userId")
    `);

    // User KYC Table
    await queryRunner.query(`
      CREATE TABLE "user_kyc" (
        "id" SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "bvn" character varying(11),
        "kycStatus" character varying NOT NULL DEFAULT 'PENDING',
        "kycProvider" character varying NOT NULL DEFAULT 'NONE',
        "kycVerifiedAt" TIMESTAMP WITH TIME ZONE,
        "kycData" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_user_kyc_userId" UNIQUE ("userId"),
        CONSTRAINT "PK_user_kyc" PRIMARY KEY ("id")
      )
    `);

    // User Security Table
    await queryRunner.query(`
      CREATE TABLE "user_security" (
        "id" SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "pin" character varying,
        "pinFailedAttempts" integer NOT NULL DEFAULT 0,
        "pinLockedUntil" TIMESTAMP WITH TIME ZONE,
        "lastLoginAt" TIMESTAMP WITH TIME ZONE,
        "lastLoginIp" character varying,
        "twoFactorEnabled" boolean NOT NULL DEFAULT false,
        "twoFactorSecret" character varying,
        "deviceFingerprint" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_user_security_userId" UNIQUE ("userId"),
        CONSTRAINT "PK_user_security" PRIMARY KEY ("id")
      )
    `);

    // User Onboarding Table
    await queryRunner.query(`
      CREATE TABLE "user_onboarding" (
        "id" SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "onboardingStep" character varying NOT NULL DEFAULT 'PERSONAL_INFORMATION',
        "isOnboardingCompleted" boolean NOT NULL DEFAULT false,
        "completedSteps" jsonb DEFAULT '[]',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_user_onboarding_userId" UNIQUE ("userId"),
        CONSTRAINT "PK_user_onboarding" PRIMARY KEY ("id")
      )
    `);

    // Wallets Table
    await queryRunner.query(`
      CREATE TABLE "wallets" (
        "id" SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "balance" numeric(10,2) NOT NULL DEFAULT 0,
        "provider" character varying NOT NULL DEFAULT 'PAYSTACK',
        "providerCustomerCode" character varying,
        "accountReference" character varying,
        "accountNumber" character varying,
        "accountName" character varying,
        "bankName" character varying,
        "bankCode" character varying,
        "accountStatus" character varying NOT NULL DEFAULT 'PENDING',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_wallets_userId" UNIQUE ("userId"),
        CONSTRAINT "UQ_wallets_accountReference" UNIQUE ("accountReference"),
        CONSTRAINT "PK_wallets" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_wallets_provider" ON "wallets" ("provider")
    `);

    // Bank Accounts Table
    await queryRunner.query(`
      CREATE TABLE "bank_accounts" (
        "id" SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "accountNumber" character varying NOT NULL,
        "accountName" character varying NOT NULL,
        "bankName" character varying NOT NULL,
        "bankCode" character varying NOT NULL,
        "isPrimary" boolean NOT NULL DEFAULT false,
        "status" character varying NOT NULL DEFAULT 'PENDING',
        "verificationData" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_bank_accounts" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_bank_accounts_userId" ON "bank_accounts" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_bank_accounts_status" ON "bank_accounts" ("status")
    `);

    // Business Payment Accounts Table
    await queryRunner.query(`
      CREATE TABLE "business_payment_accounts" (
        "id" SERIAL NOT NULL,
        "businessId" integer NOT NULL,
        "provider" character varying NOT NULL DEFAULT 'PAYSTACK',
        "subaccountCode" character varying,
        "settlementAccountNumber" character varying,
        "settlementAccountName" character varying,
        "settlementBankCode" character varying,
        "revenueSharePercentage" numeric(5,2) NOT NULL DEFAULT 95.00,
        "isActive" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_business_payment_accounts_businessId" UNIQUE ("businessId"),
        CONSTRAINT "UQ_business_payment_accounts_subaccountCode" UNIQUE ("subaccountCode"),
        CONSTRAINT "PK_business_payment_accounts" PRIMARY KEY ("id")
      )
    `);

    // Business Settlement Config Table
    await queryRunner.query(`
      CREATE TABLE "business_settlement_configs" (
        "id" SERIAL NOT NULL,
        "businessId" integer NOT NULL,
        "schedule" character varying NOT NULL DEFAULT 'DAILY',
        "dayOfWeek" integer,
        "dayOfMonth" integer,
        "minimumAmount" numeric(10,2) NOT NULL DEFAULT 1000.00,
        "isAutoSettlement" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_business_settlement_configs_businessId" UNIQUE ("businessId"),
        CONSTRAINT "PK_business_settlement_configs" PRIMARY KEY ("id")
      )
    `);

    // Product Variants Table
    await queryRunner.query(`
      CREATE TABLE "product_variants" (
        "id" SERIAL NOT NULL,
        "productId" integer NOT NULL,
        "sku" character varying NOT NULL,
        "size" character varying,
        "color" character varying,
        "price" numeric(10,2) NOT NULL,
        "quantityInStock" integer NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_product_variants_sku" UNIQUE ("sku"),
        CONSTRAINT "PK_product_variants" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_product_variants_productId" ON "product_variants" ("productId")
    `);

    // Product Images Table
    await queryRunner.query(`
      CREATE TABLE "product_images" (
        "id" SERIAL NOT NULL,
        "productId" integer NOT NULL,
        "imageUrl" character varying NOT NULL,
        "displayOrder" integer NOT NULL DEFAULT 0,
        "isPrimary" boolean NOT NULL DEFAULT false,
        "altText" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_product_images" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_product_images_productId" ON "product_images" ("productId")
    `);

    // Inventory Logs Table
    await queryRunner.query(`
      CREATE TABLE "inventory_logs" (
        "id" SERIAL NOT NULL,
        "productId" integer NOT NULL,
        "variantId" integer,
        "type" character varying NOT NULL,
        "quantityChange" integer NOT NULL,
        "quantityBefore" integer NOT NULL,
        "quantityAfter" integer NOT NULL,
        "reason" text,
        "performedBy" integer,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_inventory_logs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_inventory_logs_productId" ON "inventory_logs" ("productId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_inventory_logs_createdAt" ON "inventory_logs" ("createdAt")
    `);

    // Stock Reservations Table
    await queryRunner.query(`
      CREATE TABLE "stock_reservations" (
        "id" SERIAL NOT NULL,
        "productId" integer NOT NULL,
        "variantId" integer,
        "quantity" integer NOT NULL,
        "status" character varying NOT NULL DEFAULT 'ACTIVE',
        "reservedFor" character varying NOT NULL,
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stock_reservations" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_stock_reservations_productId" ON "stock_reservations" ("productId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_stock_reservations_status" ON "stock_reservations" ("status")
    `);

    // Order Status History Table
    await queryRunner.query(`
      CREATE TABLE "order_status_history" (
        "id" SERIAL NOT NULL,
        "orderId" integer NOT NULL,
        "status" character varying NOT NULL,
        "notes" text,
        "changedBy" integer,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_order_status_history" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_order_status_history_orderId" ON "order_status_history" ("orderId")
    `);

    // Order Payments Table
    await queryRunner.query(`
      CREATE TABLE "order_payments" (
        "id" SERIAL NOT NULL,
        "orderId" integer NOT NULL,
        "paymentReference" character varying NOT NULL,
        "provider" character varying NOT NULL,
        "paymentMethod" character varying NOT NULL,
        "amount" numeric(10,2) NOT NULL,
        "status" character varying NOT NULL DEFAULT 'PENDING',
        "paidAt" TIMESTAMP WITH TIME ZONE,
        "paymentData" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_order_payments_orderId" UNIQUE ("orderId"),
        CONSTRAINT "UQ_order_payments_paymentReference" UNIQUE ("paymentReference"),
        CONSTRAINT "PK_order_payments" PRIMARY KEY ("id")
      )
    `);

    // Order Shipments Table
    await queryRunner.query(`
      CREATE TABLE "order_shipments" (
        "id" SERIAL NOT NULL,
        "orderId" integer NOT NULL,
        "trackingNumber" character varying,
        "carrier" character varying,
        "deliveryMethod" character varying NOT NULL,
        "estimatedDeliveryDate" TIMESTAMP WITH TIME ZONE,
        "actualDeliveryDate" TIMESTAMP WITH TIME ZONE,
        "shippingAddress" text NOT NULL,
        "recipientName" character varying NOT NULL,
        "recipientPhone" character varying NOT NULL,
        "status" character varying NOT NULL DEFAULT 'PENDING',
        "shipmentData" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_order_shipments" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_order_shipments_orderId" ON "order_shipments" ("orderId")
    `);

    // Order Refunds Table
    await queryRunner.query(`
      CREATE TABLE "order_refunds" (
        "id" SERIAL NOT NULL,
        "orderId" integer NOT NULL,
        "refundReference" character varying NOT NULL,
        "amount" numeric(10,2) NOT NULL,
        "reason" text NOT NULL,
        "type" character varying NOT NULL DEFAULT 'FULL',
        "method" character varying NOT NULL DEFAULT 'ORIGINAL',
        "status" character varying NOT NULL DEFAULT 'PENDING',
        "processedAt" TIMESTAMP WITH TIME ZONE,
        "processedBy" integer,
        "refundData" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_order_refunds_refundReference" UNIQUE ("refundReference"),
        CONSTRAINT "PK_order_refunds" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_order_refunds_orderId" ON "order_refunds" ("orderId")
    `);

    // Settlements Table
    await queryRunner.query(`
      CREATE TABLE "settlements" (
        "id" SERIAL NOT NULL,
        "businessId" integer NOT NULL,
        "orderId" integer,
        "settlementReference" character varying NOT NULL,
        "amount" numeric(10,2) NOT NULL,
        "platformFee" numeric(10,2) NOT NULL,
        "netAmount" numeric(10,2) NOT NULL,
        "status" character varying NOT NULL DEFAULT 'PENDING',
        "settledAt" TIMESTAMP WITH TIME ZONE,
        "accountNumber" character varying,
        "accountName" character varying,
        "bankCode" character varying,
        "settlementData" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_settlements_settlementReference" UNIQUE ("settlementReference"),
        CONSTRAINT "UQ_settlements_orderId" UNIQUE ("orderId"),
        CONSTRAINT "PK_settlements" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_settlements_businessId" ON "settlements" ("businessId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_settlements_status" ON "settlements" ("status")
    `);

    // Carts Table
    await queryRunner.query(`
      CREATE TABLE "carts" (
        "id" SERIAL NOT NULL,
        "userId" integer,
        "sessionId" character varying,
        "status" character varying NOT NULL DEFAULT 'ACTIVE',
        "expiresAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_carts" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_carts_userId" ON "carts" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_carts_sessionId" ON "carts" ("sessionId")
    `);

    // Cart Items Table
    await queryRunner.query(`
      CREATE TABLE "cart_items" (
        "id" SERIAL NOT NULL,
        "cartId" integer NOT NULL,
        "productId" integer NOT NULL,
        "variantId" integer,
        "quantity" integer NOT NULL DEFAULT 1,
        "price" numeric(10,2) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_cart_items" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_cart_items_cartId" ON "cart_items" ("cartId")
    `);

    // Cart Abandonment Table
    await queryRunner.query(`
      CREATE TABLE "cart_abandonments" (
        "id" SERIAL NOT NULL,
        "cartId" integer NOT NULL,
        "emailSent" boolean NOT NULL DEFAULT false,
        "emailSentAt" TIMESTAMP WITH TIME ZONE,
        "recovered" boolean NOT NULL DEFAULT false,
        "recoveredAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_cart_abandonments_cartId" UNIQUE ("cartId"),
        CONSTRAINT "PK_cart_abandonments" PRIMARY KEY ("id")
      )
    `);

    // Coupons Table
    await queryRunner.query(`
      CREATE TABLE "coupons" (
        "id" SERIAL NOT NULL,
        "code" character varying NOT NULL,
        "type" character varying NOT NULL,
        "value" numeric(10,2) NOT NULL,
        "minPurchaseAmount" numeric(10,2),
        "maxDiscountAmount" numeric(10,2),
        "usageLimit" integer,
        "usageCount" integer NOT NULL DEFAULT 0,
        "perUserLimit" integer,
        "status" character varying NOT NULL DEFAULT 'ACTIVE',
        "startsAt" TIMESTAMP WITH TIME ZONE,
        "expiresAt" TIMESTAMP WITH TIME ZONE,
        "businessId" integer,
        "createdBy" integer,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_coupons_code" UNIQUE ("code"),
        CONSTRAINT "PK_coupons" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_coupons_status" ON "coupons" ("status")
    `);

    // Coupon Usage Table
    await queryRunner.query(`
      CREATE TABLE "coupon_usages" (
        "id" SERIAL NOT NULL,
        "couponId" integer NOT NULL,
        "userId" integer,
        "orderId" integer NOT NULL,
        "discountAmount" numeric(10,2) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_coupon_usages" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_coupon_usages_couponId" ON "coupon_usages" ("couponId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_coupon_usages_userId" ON "coupon_usages" ("userId")
    `);

    // Customer Profiles Table
    await queryRunner.query(`
      CREATE TABLE "customer_profiles" (
        "id" SERIAL NOT NULL,
        "userId" integer,
        "email" character varying NOT NULL,
        "phone" character varying,
        "firstName" character varying,
        "lastName" character varying,
        "totalOrders" integer NOT NULL DEFAULT 0,
        "totalSpent" numeric(10,2) NOT NULL DEFAULT 0,
        "lastOrderAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_customer_profiles" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_customer_profiles_userId" ON "customer_profiles" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_customer_profiles_email" ON "customer_profiles" ("email")
    `);

    // Addresses Table
    await queryRunner.query(`
      CREATE TABLE "addresses" (
        "id" SERIAL NOT NULL,
        "customerId" integer NOT NULL,
        "addressLine1" character varying NOT NULL,
        "addressLine2" character varying,
        "city" character varying NOT NULL,
        "state" character varying NOT NULL,
        "postalCode" character varying,
        "country" character varying NOT NULL DEFAULT 'Nigeria',
        "isDefault" boolean NOT NULL DEFAULT false,
        "label" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_addresses" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_addresses_customerId" ON "addresses" ("customerId")
    `);

    // Email Queue Table
    await queryRunner.query(`
      CREATE TABLE "email_queue" (
        "id" SERIAL NOT NULL,
        "to" character varying NOT NULL,
        "subject" character varying NOT NULL,
        "template" character varying NOT NULL,
        "templateData" jsonb,
        "status" character varying NOT NULL DEFAULT 'PENDING',
        "provider" character varying NOT NULL DEFAULT 'MAILGUN',
        "priority" integer NOT NULL DEFAULT 5,
        "attempts" integer NOT NULL DEFAULT 0,
        "maxAttempts" integer NOT NULL DEFAULT 3,
        "scheduledFor" TIMESTAMP WITH TIME ZONE,
        "sentAt" TIMESTAMP WITH TIME ZONE,
        "error" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_email_queue" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_email_queue_status" ON "email_queue" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_email_queue_scheduledFor" ON "email_queue" ("scheduledFor")
    `);

    // Email Logs Table
    await queryRunner.query(`
      CREATE TABLE "email_logs" (
        "id" SERIAL NOT NULL,
        "emailQueueId" integer,
        "to" character varying NOT NULL,
        "subject" character varying NOT NULL,
        "provider" character varying NOT NULL,
        "status" character varying NOT NULL,
        "messageId" character varying,
        "response" jsonb,
        "error" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_email_logs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_email_logs_createdAt" ON "email_logs" ("createdAt")
    `);

    // Audit Logs Table
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" SERIAL NOT NULL,
        "entityType" character varying NOT NULL,
        "entityId" integer NOT NULL,
        "action" character varying NOT NULL,
        "performedBy" integer,
        "changes" jsonb,
        "ipAddress" character varying,
        "userAgent" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_audit_logs_entityType_entityId" ON "audit_logs" ("entityType", "entityId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_audit_logs_performedBy" ON "audit_logs" ("performedBy")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_audit_logs_createdAt" ON "audit_logs" ("createdAt")
    `);

    // System Events Table
    await queryRunner.query(`
      CREATE TABLE "system_events" (
        "id" SERIAL NOT NULL,
        "eventType" character varying NOT NULL,
        "source" character varying NOT NULL,
        "severity" character varying NOT NULL DEFAULT 'INFO',
        "message" text NOT NULL,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_system_events" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_system_events_eventType" ON "system_events" ("eventType")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_system_events_severity" ON "system_events" ("severity")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_system_events_createdAt" ON "system_events" ("createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all new tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS "system_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "email_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "email_queue"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "addresses"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_profiles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "coupon_usages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "coupons"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cart_abandonments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cart_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "carts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "settlements"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "order_refunds"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "order_shipments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "order_payments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "order_status_history"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_reservations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_images"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_variants"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "business_settlement_configs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "business_payment_accounts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bank_accounts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wallets"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_onboarding"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_security"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_kyc"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_profiles"`);
  }
}
