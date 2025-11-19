import { MigrationInterface, QueryRunner } from 'typeorm';

export class Baseline1763219946237 implements MigrationInterface {
    name = 'Baseline1763219946237';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ----- ENUMS -----
        await queryRunner.query(`
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_role_enum') THEN
        CREATE TYPE "public"."users_role_enum" AS ENUM('merchant', 'admin');
    END IF;
END $$;
`);
        await queryRunner.query(`
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_onboardingstep_enum') THEN
        CREATE TYPE "public"."users_onboardingstep_enum" AS ENUM('0','1','2','3','4');
    END IF;
END $$;
`);
        await queryRunner.query(`
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'otps_otptype_enum') THEN
        CREATE TYPE "public"."otps_otptype_enum" AS ENUM('email','phone');
    END IF;
END $$;
`);
        await queryRunner.query(`
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'otps_purpose_enum') THEN
        CREATE TYPE "public"."otps_purpose_enum" AS ENUM('phone_verification','password_reset','email_verification','pin_creation');
    END IF;
END $$;
`);
        await queryRunner.query(`
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_sizes_measurement_enum') THEN
        CREATE TYPE "public"."product_sizes_measurement_enum" AS ENUM('SIZE','LABEL');
    END IF;
END $$;
`);
        await queryRunner.query(`
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'orders_status_enum') THEN
        CREATE TYPE "public"."orders_status_enum" AS ENUM('PENDING','PROCESSING','CONFIRMED','SHIPPED','DELIVERED','CANCELLED','RETURNED','REFUNDED');
    END IF;
END $$;
`);
        await queryRunner.query(`
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'orders_paymentstatus_enum') THEN
        CREATE TYPE "public"."orders_paymentstatus_enum" AS ENUM('PENDING','INITIATED','PAID','PARTIALLY_PAID','FAILED','REFUNDED','PARTIALLY_REFUNDED','EXPIRED');
    END IF;
END $$;
`);
        await queryRunner.query(`
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'orders_paymentmethod_enum') THEN
        CREATE TYPE "public"."orders_paymentmethod_enum" AS ENUM('MONNIFY','BANK_TRANSFER','CARD','WALLET','CASH_ON_DELIVERY','USSD');
    END IF;
END $$;
`);
        await queryRunner.query(`
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'orders_deliverymethod_enum') THEN
        CREATE TYPE "public"."orders_deliverymethod_enum" AS ENUM('STANDARD','EXPRESS','PICKUP');
    END IF;
END $$;
`);
        await queryRunner.query(`
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_items_status_enum') THEN
        CREATE TYPE "public"."order_items_status_enum" AS ENUM('PENDING','PROCESSING','SHIPPED','DELIVERED','CANCELLED','RETURNED','REFUNDED');
    END IF;
END $$;
`);

        // ----- TABLES -----
        await queryRunner.query(`
CREATE TABLE IF NOT EXISTS "business_types" (
    "id" SERIAL PRIMARY KEY,
    "name" character varying NOT NULL UNIQUE,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);
`);
        await queryRunner.query(`
CREATE TABLE IF NOT EXISTS "businesses" (
    "id" SERIAL PRIMARY KEY,
    "businessName" character varying NOT NULL,
    "businessTypeId" integer NOT NULL,
    "businessDescription" character varying,
    "location" character varying NOT NULL,
    "logo" character varying,
    "userId" integer NOT NULL UNIQUE,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);
`);
        await queryRunner.query(`
CREATE TABLE IF NOT EXISTS "users" (
    "id" SERIAL PRIMARY KEY,
    "email" character varying NOT NULL UNIQUE,
    "firstName" character varying NOT NULL,
    "lastName" character varying NOT NULL,
    "password" character varying NOT NULL,
    "phone" character varying(20) NOT NULL UNIQUE,
    "bvn" character varying(11),
    "pin" character varying,
    "role" "public"."users_role_enum" NOT NULL DEFAULT 'merchant',
    "walletReference" character varying,
    "walletAccountNumber" character varying,
    "walletAccountName" character varying,
    "walletBankName" character varying,
    "walletBankCode" character varying,
    "personalAccountNumber" character varying,
    "personalAccountName" character varying,
    "personalBankName" character varying,
    "personalBankCode" character varying,
    "businessId" integer UNIQUE,
    "isEmailVerified" boolean NOT NULL DEFAULT false,
    "isPhoneVerified" boolean NOT NULL DEFAULT false,
    "onboardingStep" "public"."users_onboardingstep_enum" NOT NULL DEFAULT '0',
    "isOnboardingCompleted" boolean NOT NULL DEFAULT false,
    "deviceId" character varying NOT NULL,
    "longitude" double precision NOT NULL,
    "latitude" double precision NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);
`);

        await queryRunner.query(`
CREATE TABLE IF NOT EXISTS "otps" (
    "id" SERIAL PRIMARY KEY,
    "userId" integer NOT NULL,
    "otp" character varying(50) NOT NULL,
    "otpType" "public"."otps_otptype_enum" NOT NULL,
    "purpose" "public"."otps_purpose_enum" NOT NULL DEFAULT 'phone_verification',
    "expiresAt" TIMESTAMP NOT NULL,
    "isUsed" boolean NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);
`);

        await queryRunner.query(`
CREATE TABLE IF NOT EXISTS "product_sizes" (
    "id" SERIAL PRIMARY KEY,
    "measurement" "public"."product_sizes_measurement_enum" NOT NULL,
    "value" text NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "productId" integer
);
`);

        await queryRunner.query(`
CREATE TABLE IF NOT EXISTS "categories" (
    "id" SERIAL PRIMARY KEY,
    "name" character varying NOT NULL UNIQUE,
    "parentId" integer,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);
`);
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_8b0be371d28245da6e4f4b6187" ON "categories" ("name")`,
        );

        await queryRunner.query(`
CREATE TABLE IF NOT EXISTS "products" (
    "id" SERIAL PRIMARY KEY,
    "userId" integer NOT NULL,
    "businessId" integer NOT NULL,
    "images" text,
    "name" character varying NOT NULL,
    "categoryId" integer NOT NULL,
    "description" text NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "quantityInStock" integer NOT NULL DEFAULT 0,
    "hasVariation" boolean NOT NULL DEFAULT false,
    "colors" text,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    "deletedAt" TIMESTAMP
);
`);
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_99d90c2a483d79f3b627fb1d5e" ON "products" ("userId")`,
        );
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_359bd8406fbfb50e3ea42b5631" ON "products" ("businessId")`,
        );
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_4c9fb58de893725258746385e1" ON "products" ("name")`,
        );
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_ff56834e735fa78a15d0cf2192" ON "products" ("categoryId")`,
        );
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_75895eeb1903f8a17816dafe0a" ON "products" ("price")`,
        );
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_0591b4a1abb428c6d86744cc0a" ON "products" ("quantityInStock")`,
        );
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_63fcb3d8806a6efd53dbc67430" ON "products" ("createdAt")`,
        );
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_69e49df9a08f8ded911758822f" ON "products" ("userId", "businessId")`,
        );

        // ----- ORDERS -----
        await queryRunner.query(`
CREATE TABLE IF NOT EXISTS "orders" (
    "id" SERIAL PRIMARY KEY,
    "orderReference" character varying NOT NULL UNIQUE,
    "userId" integer NOT NULL,
    "businessId" integer NOT NULL,
    "transactionReference" character varying UNIQUE,
    "customerName" character varying NOT NULL,
    "deliveryAddress" text NOT NULL,
    "state" character varying NOT NULL,
    "city" character varying,
    "customerEmail" character varying NOT NULL,
    "customerPhoneNumber" character varying NOT NULL,
    "status" "public"."orders_status_enum" NOT NULL DEFAULT 'PENDING',
    "paymentStatus" "public"."orders_paymentstatus_enum" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "public"."orders_paymentmethod_enum" NOT NULL,
    "deliveryMethod" "public"."orders_deliverymethod_enum" NOT NULL,
    "subtotal" numeric(10,2) NOT NULL,
    "shippingFee" numeric(10,2) NOT NULL,
    "tax" numeric(10,2) NOT NULL,
    "discount" numeric(10,2) NOT NULL DEFAULT 0,
    "total" numeric(10,2) NOT NULL,
    "paymentDate" TIMESTAMP,
    "paymentDetails" json,
    "estimatedDeliveryDate" TIMESTAMP,
    "deliveryDate" TIMESTAMP,
    "deliveryDetails" json,
    "notes" text,
    "isBusinessSettled" boolean NOT NULL DEFAULT false,
    "settlementReference" character varying,
    "settlementDate" TIMESTAMP,
    "settlementDetails" json,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    "deletedAt" TIMESTAMP
);
`);
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_151b79a83ba240b0cb31b2302d" ON "orders" ("userId")`,
        );
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_778777c5d7d56ed1bbaa907b8e" ON "orders" ("businessId")`,
        );
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_01b20118a3f640214e7a8a6b29" ON "orders" ("paymentStatus")`,
        );
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_775c9f06fc27ae3ff8fb26f2c4" ON "orders" ("status")`,
        );
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_1f4b9818a08b822a31493fdee9" ON "orders" ("createdAt")`,
        );
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_5025e0259ec0b1ffb5f0ea6685" ON "orders" ("userId", "businessId")`,
        );

        // ----- ORDER ITEMS -----
        await queryRunner.query(`
CREATE TABLE IF NOT EXISTS "order_items" (
    "id" SERIAL PRIMARY KEY,
    "orderId" integer NOT NULL,
    "productId" integer NOT NULL,
    "productName" character varying NOT NULL,
    "productDescription" text,
    "price" numeric(10,2) NOT NULL,
    "quantity" integer NOT NULL DEFAULT 1,
    "subtotal" numeric(10,2) NOT NULL,
    "color" character varying,
    "size" character varying,
    "imageUrls" text,
    "status" "public"."order_items_status_enum" NOT NULL DEFAULT 'PENDING',
    "notes" text,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    "deletedAt" TIMESTAMP
);
`);
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_f1d359a55923bb45b057fbdab0" ON "order_items" ("orderId")`,
        );
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_cdb99c05982d5191ac8465ac01" ON "order_items" ("productId")`,
        );
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_f421c8981cca05954f98667134" ON "order_items" ("status")`,
        );

        // ----- REVIEWS -----
        await queryRunner.query(`
CREATE TABLE IF NOT EXISTS "reviews" (
    "id" SERIAL PRIMARY KEY,
    "userId" integer NOT NULL,
    "businessId" integer NOT NULL,
    "productId" integer NOT NULL,
    "orderId" integer NOT NULL,
    "orderItemId" integer NOT NULL,
    "review" text NOT NULL,
    "ratings" integer NOT NULL,
    "imageUrls" text,
    "isVisible" boolean NOT NULL DEFAULT true,
    "isVerifiedPurchase" boolean NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    "deletedAt" TIMESTAMP
);
`);
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_7ed5659e7139fc8bc039198cc1" ON "reviews" ("userId")`,
        );
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_d17ce9c119d29c7ec8c884044c" ON "reviews" ("businessId")`,
        );
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_a6b3c434392f5d10ec17104366" ON "reviews" ("productId")`,
        );
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_53a68dc905777554b7f702791f" ON "reviews" ("orderId")`,
        );
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_1e6c554d615dd5a5bf0e11ee0e" ON "reviews" ("orderItemId")`,
        );

        // ----- LEAD FORMS -----
        await queryRunner.query(`
CREATE TABLE IF NOT EXISTS "lead-forms" (
    "id" SERIAL PRIMARY KEY,
    "title" character varying NOT NULL,
    "description" text,
    "button_text" character varying NOT NULL,
    "inputs" jsonb,
    "logoUrl" character varying,
    "isActive" boolean NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);
`);

        await queryRunner.query(`
CREATE TABLE IF NOT EXISTS "leads" (
    "id" SERIAL PRIMARY KEY,
    "name" character varying,
    "email" character varying NOT NULL,
    "phone" character varying,
    "formId" integer NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);
`);

        await queryRunner.query(`
CREATE TABLE IF NOT EXISTS "store-fronts" (
    "id" SERIAL PRIMARY KEY,
    "businessId" integer NOT NULL UNIQUE,
    "coverImage" character varying NOT NULL,
    "storeName" character varying NOT NULL,
    "heroText" character varying NOT NULL,
    "storeColor" character varying NOT NULL,
    "categoryName" text[],
    "categoryImage" text[],
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);
`);

        const fkQueries = [
            `ALTER TABLE "businesses" ADD CONSTRAINT "FK_01845bacd013698b8bffb920933" FOREIGN KEY ("businessTypeId") REFERENCES "business_types"("id")`,
            `ALTER TABLE "businesses" ADD CONSTRAINT "FK_5ba6375fdc72387a2d2d0bb7720" FOREIGN KEY ("userId") REFERENCES "users"("id")`,
            `ALTER TABLE "users" ADD CONSTRAINT "FK_78725ac7117e7526e028014606" FOREIGN KEY ("businessId") REFERENCES "businesses"("id")`,
            `ALTER TABLE "otps" ADD CONSTRAINT "FK_82b0deb105275568cdcef2823eb" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`,
            `ALTER TABLE "product_sizes" ADD CONSTRAINT "FK_699f5366c2ebf46a77589bd225e" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE`,
            `ALTER TABLE "categories" ADD CONSTRAINT "FK_9a6f051e66982b5f0318981bcaa" FOREIGN KEY ("parentId") REFERENCES "categories"("id")`,
            `ALTER TABLE "products" ADD CONSTRAINT "FK_99d90c2a483d79f3b627fb1d5e9" FOREIGN KEY ("userId") REFERENCES "users"("id")`,
            `ALTER TABLE "products" ADD CONSTRAINT "FK_359bd8406fbfb50e3ea42b5631f" FOREIGN KEY ("businessId") REFERENCES "businesses"("id")`,
            `ALTER TABLE "products" ADD CONSTRAINT "FK_ff56834e735fa78a15d0cf21926" FOREIGN KEY ("categoryId") REFERENCES "categories"("id")`,
            `ALTER TABLE "orders" ADD CONSTRAINT "FK_151b79a83ba240b0cb31b2302d1" FOREIGN KEY ("userId") REFERENCES "users"("id")`,
            `ALTER TABLE "orders" ADD CONSTRAINT "FK_778777c5d7d56ed1bbaa907b8e5" FOREIGN KEY ("businessId") REFERENCES "businesses"("id")`,
            `ALTER TABLE "order_items" ADD CONSTRAINT "FK_f1d359a55923bb45b057fbdab0d" FOREIGN KEY ("orderId") REFERENCES "orders"("id")`,
            `ALTER TABLE "order_items" ADD CONSTRAINT "FK_cdb99c05982d5191ac8465ac01f" FOREIGN KEY ("productId") REFERENCES "products"("id")`,
            `ALTER TABLE "reviews" ADD CONSTRAINT "FK_7ed5659e7139fc8bc039198cc1e" FOREIGN KEY ("userId") REFERENCES "users"("id")`,
            `ALTER TABLE "reviews" ADD CONSTRAINT "FK_d17ce9c119d29c7ec8c884044c7" FOREIGN KEY ("businessId") REFERENCES "businesses"("id")`,
            `ALTER TABLE "reviews" ADD CONSTRAINT "FK_a6b3c434392f5d10ec17104366b" FOREIGN KEY ("productId") REFERENCES "products"("id")`,
            `ALTER TABLE "reviews" ADD CONSTRAINT "FK_53a68dc905777554b7f702791fd" FOREIGN KEY ("orderId") REFERENCES "orders"("id")`,
            `ALTER TABLE "reviews" ADD CONSTRAINT "FK_1e6c554d615dd5a5bf0e11ee0ef" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id")`,
            `ALTER TABLE "leads" ADD CONSTRAINT "FK_987cb4ff04d8e38b9b6f3bb105a" FOREIGN KEY ("formId") REFERENCES "lead-forms"("id")`,
            `ALTER TABLE "store-fronts" ADD CONSTRAINT "FK_store_fronts_businessId" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE`,
        ];

        for (const fk of fkQueries) {
            // Extract constraint name (3rd quoted string: ALTER TABLE "table" ADD CONSTRAINT "constraint_name" ...)
            const constraintName = fk.split('"')[3];
            await queryRunner.query(`
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = '${constraintName}'
    ) THEN
        ${fk};
    END IF;
END $$;
`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign keys first (reverse order of creation)
        await queryRunner.query(`ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "FK_08e50b251ecb4417800af268b26"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "FK_1e6c554d615dd5a5bf0e11ee0e9"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "FK_53a68dc905777554b7f702791fa"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "FK_a6b3c434392f5d10ec171043666"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "FK_d17ce9c119d29c7ec8c884044cb"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "FK_7ed5659e7139fc8bc039198cc1"`);
        await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "FK_cdb99c05982d5191ac8465ac010"`);
        await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "FK_f1d359a55923bb45b057fbdab0d"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "FK_778777c5d7d56ed1bbaa907b8e5"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "FK_151b79a83ba240b0cb31b2302d1"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "FK_ff56834e735fa78a15d0cf21926"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "FK_359bd8406fbfb50e3ea42b5631f"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "FK_99d90c2a483d79f3b627fb1d5e9"`);
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "FK_9a6f051e66982b5f0318981bcaa"`);
        await queryRunner.query(`ALTER TABLE "product_sizes" DROP CONSTRAINT IF EXISTS "FK_699f5366c2ebf46a77589bd225e"`);
        await queryRunner.query(`ALTER TABLE "otps" DROP CONSTRAINT IF EXISTS "FK_82b0deb105275568cdcef2823eb"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_78725ac7117e7526e028014606b"`);
        await queryRunner.query(`ALTER TABLE "businesses" DROP CONSTRAINT IF EXISTS "FK_5ba6375fdc72387a2d2d0bb7720"`);
        await queryRunner.query(`ALTER TABLE "businesses" DROP CONSTRAINT IF EXISTS "FK_01845bacd013698b8bffb920933"`);
        await queryRunner.query(`ALTER TABLE "store-fronts" DROP CONSTRAINT IF EXISTS "FK_store_fronts_businessId"`);

        // Drop tables (reverse dependency order)
        await queryRunner.query(`DROP TABLE IF EXISTS "store-fronts"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "leads"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "lead-forms"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "reviews"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "order_items"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "orders"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "products"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "categories"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "product_sizes"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "otps"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "businesses"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "business_types"`);

        // Drop enums
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."order_items_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."orders_deliverymethod_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."orders_paymentmethod_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."orders_paymentstatus_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."orders_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."product_sizes_measurement_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."otps_purpose_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."otps_otptype_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_onboardingstep_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_role_enum"`);
    }

}
