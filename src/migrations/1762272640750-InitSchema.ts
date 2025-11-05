import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1762272640750 implements MigrationInterface {
    name = 'InitSchema1762272640750'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "business_types" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_3894005288e759379ee7b56622a" UNIQUE ("name"), CONSTRAINT "PK_3c34c2b0b96fd7d13d7b4750b27" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "businesses" ("id" SERIAL NOT NULL, "businessName" character varying NOT NULL, "businessTypeId" integer NOT NULL, "businessDescription" character varying, "location" character varying NOT NULL, "logo" character varying, "userId" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_5ba6375fdc72387a2d2d0bb7720" UNIQUE ("userId"), CONSTRAINT "REL_5ba6375fdc72387a2d2d0bb772" UNIQUE ("userId"), CONSTRAINT "PK_bc1bf63498dd2368ce3dc8686e8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('merchant', 'admin')`);
        await queryRunner.query(`CREATE TYPE "public"."users_onboardingstep_enum" AS ENUM('0', '1', '2', '3', '4')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" SERIAL NOT NULL, "email" character varying NOT NULL, "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "password" character varying NOT NULL, "phone" character varying(13) NOT NULL, "bvn" character varying(11), "pin" character varying, "role" "public"."users_role_enum" NOT NULL DEFAULT 'merchant', "walletReference" character varying, "walletAccountNumber" character varying, "walletAccountName" character varying, "walletBankName" character varying, "walletBankCode" character varying, "businessId" integer, "isEmailVerified" boolean NOT NULL DEFAULT false, "isPhoneVerified" boolean NOT NULL DEFAULT false, "onboardingStep" "public"."users_onboardingstep_enum" NOT NULL DEFAULT '0', "isOnboardingCompleted" boolean NOT NULL DEFAULT false, "deviceId" character varying NOT NULL, "longitude" double precision NOT NULL, "latitude" double precision NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "UQ_a000cca60bcf04454e727699490" UNIQUE ("phone"), CONSTRAINT "UQ_78725ac7117e7526e028014606b" UNIQUE ("businessId"), CONSTRAINT "REL_78725ac7117e7526e028014606" UNIQUE ("businessId"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")); COMMENT ON COLUMN "users"."pin" IS 'Encrypted PIN for user authentication'; COMMENT ON COLUMN "users"."role" IS 'User role: merchant or admin'; COMMENT ON COLUMN "users"."walletReference" IS 'Monnify wallet reference'; COMMENT ON COLUMN "users"."walletAccountNumber" IS 'Monnify wallet account number'; COMMENT ON COLUMN "users"."walletAccountName" IS 'Monnify wallet account name'; COMMENT ON COLUMN "users"."walletBankName" IS 'Monnify wallet bank name'; COMMENT ON COLUMN "users"."walletBankCode" IS 'Monnify wallet bank code'; COMMENT ON COLUMN "users"."onboardingStep" IS 'Current onboarding step for the user (0: Personal Info, 1: Phone Verification, 2: Business Info, 3: KYC, 4: PIN)'; COMMENT ON COLUMN "users"."isOnboardingCompleted" IS 'Whether user has completed all onboarding steps'`);
        await queryRunner.query(`CREATE TYPE "public"."otps_otptype_enum" AS ENUM('email', 'phone')`);
        await queryRunner.query(`CREATE TYPE "public"."otps_purpose_enum" AS ENUM('phone_verification', 'password_reset', 'email_verification', 'pin_creation')`);
        await queryRunner.query(`CREATE TABLE "otps" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "otp" character varying(50) NOT NULL, "otpType" "public"."otps_otptype_enum" NOT NULL, "purpose" "public"."otps_purpose_enum" NOT NULL DEFAULT 'phone_verification', "expiresAt" TIMESTAMP NOT NULL, "isUsed" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_91fef5ed60605b854a2115d2410" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."orders_orderstatus_enum" AS ENUM('ordered', 'dispatched', 'delivered', 'returned')`);
        await queryRunner.query(`CREATE TYPE "public"."orders_transactionstatus_enum" AS ENUM('pending', 'successful', 'failed', 'cancelled')`);
        await queryRunner.query(`CREATE TYPE "public"."orders_transactionmedium_enum" AS ENUM('web', 'mobile')`);
        await queryRunner.query(`CREATE TABLE "orders" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "businessId" integer NOT NULL, "transactionRef" character varying NOT NULL, "customerName" character varying NOT NULL, "deliveryAddress" text NOT NULL, "state" character varying NOT NULL, "customerEmail" character varying NOT NULL, "customerPhoneNumber" character varying NOT NULL, "orderStatus" "public"."orders_orderstatus_enum" NOT NULL DEFAULT 'ordered', "transactionStatus" "public"."orders_transactionstatus_enum" NOT NULL DEFAULT 'pending', "transactionMedium" "public"."orders_transactionmedium_enum" NOT NULL, "dateOfTransaction" TIMESTAMP NOT NULL DEFAULT now(), "productDetails" json NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_b44079e7599f6198a41c9dde63f" UNIQUE ("transactionRef"), CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id")); COMMENT ON COLUMN "orders"."productDetails" IS 'Array of product details including product ID, quantity, and colour'`);
        await queryRunner.query(`CREATE TABLE "products" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "businessId" integer NOT NULL, "images" text, "color" character varying, "title" character varying NOT NULL, "description" text, "price" numeric(10,2) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id")); COMMENT ON COLUMN "products"."images" IS 'Array of image URLs'; COMMENT ON COLUMN "products"."color" IS 'Hex color value'`);
        await queryRunner.query(`CREATE TABLE "reviews" ("id" SERIAL NOT NULL, "businessId" integer NOT NULL, "productId" integer NOT NULL, "orderId" integer NOT NULL, "review" text NOT NULL, "ratings" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_231ae565c273ee700b283f15c1d" PRIMARY KEY ("id")); COMMENT ON COLUMN "reviews"."ratings" IS 'Rating between 1-5'`);
        await queryRunner.query(`ALTER TABLE "businesses" ADD CONSTRAINT "FK_01845bacd013698b8bffb920933" FOREIGN KEY ("businessTypeId") REFERENCES "business_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "businesses" ADD CONSTRAINT "FK_5ba6375fdc72387a2d2d0bb7720" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_78725ac7117e7526e028014606b" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "otps" ADD CONSTRAINT "FK_82b0deb105275568cdcef2823eb" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_151b79a83ba240b0cb31b2302d1" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_778777c5d7d56ed1bbaa907b8e5" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_99d90c2a483d79f3b627fb1d5e9" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_359bd8406fbfb50e3ea42b5631f" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_d17ce9c119d29c7ec8c884044cb" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_a6b3c434392f5d10ec171043666" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_a6b3c434392f5d10ec171043666"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_d17ce9c119d29c7ec8c884044cb"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_359bd8406fbfb50e3ea42b5631f"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_99d90c2a483d79f3b627fb1d5e9"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_778777c5d7d56ed1bbaa907b8e5"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_151b79a83ba240b0cb31b2302d1"`);
        await queryRunner.query(`ALTER TABLE "otps" DROP CONSTRAINT "FK_82b0deb105275568cdcef2823eb"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_78725ac7117e7526e028014606b"`);
        await queryRunner.query(`ALTER TABLE "businesses" DROP CONSTRAINT "FK_5ba6375fdc72387a2d2d0bb7720"`);
        await queryRunner.query(`ALTER TABLE "businesses" DROP CONSTRAINT "FK_01845bacd013698b8bffb920933"`);
        await queryRunner.query(`DROP TABLE "reviews"`);
        await queryRunner.query(`DROP TABLE "products"`);
        await queryRunner.query(`DROP TABLE "orders"`);
        await queryRunner.query(`DROP TYPE "public"."orders_transactionmedium_enum"`);
        await queryRunner.query(`DROP TYPE "public"."orders_transactionstatus_enum"`);
        await queryRunner.query(`DROP TYPE "public"."orders_orderstatus_enum"`);
        await queryRunner.query(`DROP TABLE "otps"`);
        await queryRunner.query(`DROP TYPE "public"."otps_purpose_enum"`);
        await queryRunner.query(`DROP TYPE "public"."otps_otptype_enum"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_onboardingstep_enum"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP TABLE "businesses"`);
        await queryRunner.query(`DROP TABLE "business_types"`);
    }

}
