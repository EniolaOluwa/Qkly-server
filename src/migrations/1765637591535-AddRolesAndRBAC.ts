import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRolesAndRBAC1765637591535 implements MigrationInterface {
    name = 'AddRolesAndRBAC1765637591535'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_78725ac7117e7526e028014606"`);
        await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT "FK_cdb99c05982d5191ac8465ac01f"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_1e6c554d615dd5a5bf0e11ee0ef"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_53a68dc905777554b7f702791fd"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_a6b3c434392f5d10ec17104366b"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_d17ce9c119d29c7ec8c884044c7"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_7ed5659e7139fc8bc039198cc1e"`);
        await queryRunner.query(`ALTER TABLE "lead-forms" DROP CONSTRAINT "FK_leadforms_businessId"`);
        await queryRunner.query(`ALTER TABLE "leads" DROP CONSTRAINT "FK_leads_businessId"`);
        await queryRunner.query(`ALTER TABLE "leads" DROP CONSTRAINT "FK_leads_formId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_orders_customerEmail"`);
        await queryRunner.query(`CREATE TYPE "public"."roles_usertype_enum" AS ENUM('user', 'admin', 'super_admin')`);
        await queryRunner.query(`CREATE TYPE "public"."roles_status_enum" AS ENUM('active', 'inactive', 'suspended')`);
        await queryRunner.query(`CREATE TABLE "roles" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" character varying, "userType" "public"."roles_usertype_enum" NOT NULL, "permissions" text, "status" "public"."roles_status_enum" NOT NULL DEFAULT 'active', "isSystemRole" boolean NOT NULL DEFAULT false, "priority" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdBy" integer, "updatedBy" integer, CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7" UNIQUE ("name"), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id")); COMMENT ON COLUMN "roles"."userType" IS 'Determines if this role is for users or administrative staff'; COMMENT ON COLUMN "roles"."permissions" IS 'Array of permission strings'; COMMENT ON COLUMN "roles"."isSystemRole" IS 'System roles cannot be deleted'; COMMENT ON COLUMN "roles"."priority" IS 'Higher priority = more privileges'`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."users_usertype_enum" AS ENUM('user', 'admin', 'super_admin')`);
        await queryRunner.query(`ALTER TABLE "users" ADD "userType" "public"."users_usertype_enum" NOT NULL DEFAULT 'user'`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."userType" IS 'User type: user or admin'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "roleId" integer`);
        await queryRunner.query(`CREATE TYPE "public"."users_status_enum" AS ENUM('active', 'inactive', 'suspended', 'banned')`);
        await queryRunner.query(`ALTER TABLE "users" ADD "status" "public"."users_status_enum" NOT NULL DEFAULT 'active'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "statusReason" character varying`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."statusReason" IS 'Reason for suspension/ban'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "suspendedUntil" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "users" ADD "lastLoginAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "users" ADD "lastLoginIp" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD "createdBy" integer`);
        await queryRunner.query(`ALTER TABLE "users" ADD "suspendedBy" integer`);
        await queryRunner.query(`ALTER TABLE "traffic_events" DROP COLUMN "userAgent"`);
        await queryRunner.query(`ALTER TABLE "traffic_events" ADD "userAgent" text`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."personalAccountNumber" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."personalAccountName" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."personalBankName" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."personalBankCode" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."onboardingStep" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."isOnboardingCompleted" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."paystackCustomerCode" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."paystackDedicatedAccountId" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."paystackAccountStatus" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."paymentProvider" IS NULL`);
        await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "lead-forms_id_seq" OWNED BY "lead-forms"."id"`);
        await queryRunner.query(`ALTER TABLE "lead-forms" ALTER COLUMN "id" SET DEFAULT nextval('"lead-forms_id_seq"')`);
        await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "leads_id_seq" OWNED BY "leads"."id"`);
        await queryRunner.query(`ALTER TABLE "leads" ALTER COLUMN "id" SET DEFAULT nextval('"leads_id_seq"')`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_368e146b785b574f42ae9e53d5e" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "leads" ADD CONSTRAINT "FK_08e50b251ecb4417800af268b26" FOREIGN KEY ("formId") REFERENCES "lead-forms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "leads" ADD CONSTRAINT "FK_daf8eb3d52d018ea43df6d5edab" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "leads" DROP CONSTRAINT "FK_daf8eb3d52d018ea43df6d5edab"`);
        await queryRunner.query(`ALTER TABLE "leads" DROP CONSTRAINT "FK_08e50b251ecb4417800af268b26"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_368e146b785b574f42ae9e53d5e"`);
        await queryRunner.query(`ALTER TABLE "leads" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`DROP SEQUENCE "leads_id_seq"`);
        await queryRunner.query(`ALTER TABLE "lead-forms" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`DROP SEQUENCE "lead-forms_id_seq"`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."paymentProvider" IS 'Payment provider for this user'`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."paystackAccountStatus" IS 'DVA account status'`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."paystackDedicatedAccountId" IS 'Paystack dedicated account ID'`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."paystackCustomerCode" IS 'Paystack customer code'`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."isOnboardingCompleted" IS 'Whether user has completed all onboarding steps'`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."onboardingStep" IS 'Current onboarding step for the user (0: Personal Info, 1: Phone Verification, 2: Business Info, 3: KYC, 4: PIN)'`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."personalBankCode" IS 'User’s preferred bank code for payouts'`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."personalBankName" IS 'User’s preferred bank name for payouts'`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."personalAccountName" IS 'User’s preferred bank account name for payouts'`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."personalAccountNumber" IS 'User’s preferred bank account number for payouts'`);
        await queryRunner.query(`ALTER TABLE "traffic_events" DROP COLUMN "userAgent"`);
        await queryRunner.query(`ALTER TABLE "traffic_events" ADD "userAgent" character varying`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "suspendedBy"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "createdBy"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "lastLoginIp"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "lastLoginAt"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "suspendedUntil"`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."statusReason" IS 'Reason for suspension/ban'`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "statusReason"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "roleId"`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."userType" IS 'User type: user or admin'`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "userType"`);
        await queryRunner.query(`DROP TYPE "public"."users_usertype_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('merchant', 'admin')`);
        await queryRunner.query(`ALTER TABLE "users" ADD "role" "public"."users_role_enum" NOT NULL DEFAULT 'merchant'`);
        await queryRunner.query(`DROP TABLE "roles"`);
        await queryRunner.query(`DROP TYPE "public"."roles_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."roles_usertype_enum"`);
        await queryRunner.query(`CREATE INDEX "IDX_orders_customerEmail" ON "orders" ("customerEmail") `);
        await queryRunner.query(`ALTER TABLE "leads" ADD CONSTRAINT "FK_leads_formId" FOREIGN KEY ("formId") REFERENCES "lead-forms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "leads" ADD CONSTRAINT "FK_leads_businessId" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lead-forms" ADD CONSTRAINT "FK_leadforms_businessId" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_7ed5659e7139fc8bc039198cc1e" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_d17ce9c119d29c7ec8c884044c7" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_a6b3c434392f5d10ec17104366b" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_53a68dc905777554b7f702791fd" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_1e6c554d615dd5a5bf0e11ee0ef" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_items" ADD CONSTRAINT "FK_cdb99c05982d5191ac8465ac01f" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_78725ac7117e7526e028014606" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
