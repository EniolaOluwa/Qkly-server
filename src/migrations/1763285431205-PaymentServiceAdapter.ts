import { MigrationInterface, QueryRunner } from "typeorm";

export class PaymentServiceAdapter1763285431205 implements MigrationInterface {
    name = 'PaymentServiceAdapter1763285431205'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."transactions_type_enum" AS ENUM('ORDER_PAYMENT', 'SETTLEMENT', 'WITHDRAWAL', 'REFUND', 'WALLET_FUNDING', 'FEE')`);
        await queryRunner.query(`CREATE TYPE "public"."transactions_flow_enum" AS ENUM('CREDIT', 'DEBIT')`);
        await queryRunner.query(`CREATE TYPE "public"."transactions_status_enum" AS ENUM('PENDING', 'SUCCESS', 'FAILED', 'REVERSED')`);
        await queryRunner.query(`CREATE TABLE "transactions" ("id" SERIAL NOT NULL, "reference" character varying NOT NULL, "userId" integer, "businessId" integer, "orderId" integer, "type" "public"."transactions_type_enum" NOT NULL, "flow" "public"."transactions_flow_enum" NOT NULL, "status" "public"."transactions_status_enum" NOT NULL DEFAULT 'PENDING', "amount" numeric(15,2) NOT NULL, "fee" numeric(15,2) NOT NULL DEFAULT '0', "netAmount" numeric(15,2) NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'NGN', "paymentMethod" character varying, "paymentProvider" character varying, "providerReference" character varying, "description" text, "senderAccountNumber" character varying, "senderAccountName" character varying, "senderBankName" character varying, "recipientAccountNumber" character varying, "recipientAccountName" character varying, "recipientBankName" character varying, "balanceBefore" numeric(15,2) NOT NULL DEFAULT '0', "balanceAfter" numeric(15,2) NOT NULL DEFAULT '0', "metadata" json, "providerResponse" json, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "settledAt" TIMESTAMP, CONSTRAINT "UQ_dd85cc865e0c3d5d4be095d3f3f" UNIQUE ("reference"), CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6bb58f2b6e30cb51a6504599f4" ON "transactions" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_9f24c9c8611e077a48a0645e3d" ON "transactions" ("businessId") `);
        await queryRunner.query(`CREATE INDEX "IDX_2fdbbae70ff802bc8b703ee7c5" ON "transactions" ("orderId") `);
        await queryRunner.query(`CREATE INDEX "IDX_2d5fa024a84dceb158b2b95f34" ON "transactions" ("type") `);
        await queryRunner.query(`CREATE INDEX "IDX_da87c55b3bbbe96c6ed88ea7ee" ON "transactions" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_e744417ceb0b530285c08f3865" ON "transactions" ("createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_85d65d236f62b4496cd115f097" ON "transactions" ("userId", "businessId") `);
        await queryRunner.query(`ALTER TABLE "businesses" ADD "paystackSubaccountCode" character varying`);
        await queryRunner.query(`COMMENT ON COLUMN "businesses"."paystackSubaccountCode" IS 'Paystack subaccount code for split payments'`);
        await queryRunner.query(`ALTER TABLE "businesses" ADD "revenueSharePercentage" numeric(5,2) NOT NULL DEFAULT '95'`);
        await queryRunner.query(`COMMENT ON COLUMN "businesses"."revenueSharePercentage" IS 'Percentage business receives from sales (100 - platform fee)'`);
        await queryRunner.query(`ALTER TABLE "businesses" ADD "isSubaccountActive" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`COMMENT ON COLUMN "businesses"."isSubaccountActive" IS 'Whether subaccount is verified and active'`);
        await queryRunner.query(`ALTER TABLE "businesses" ADD "settlementSchedule" character varying`);
        await queryRunner.query(`COMMENT ON COLUMN "businesses"."settlementSchedule" IS 'Settlement schedule for this business'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "paystackCustomerCode" character varying`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."paystackCustomerCode" IS 'Paystack customer code'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "paystackDedicatedAccountId" character varying`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."paystackDedicatedAccountId" IS 'Paystack dedicated account ID'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "paystackAccountStatus" character varying NOT NULL DEFAULT 'PENDING'`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."paystackAccountStatus" IS 'DVA account status'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "paymentProvider" character varying NOT NULL DEFAULT 'PAYSTACK'`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."paymentProvider" IS 'Payment provider for this user'`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "isRefunded" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "refundedAmount" numeric(10,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "refundReference" character varying`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "refundDate" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "refundDetails" json`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_6bb58f2b6e30cb51a6504599f41" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_9f24c9c8611e077a48a0645e3df" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_2fdbbae70ff802bc8b703ee7c5c" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_2fdbbae70ff802bc8b703ee7c5c"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_9f24c9c8611e077a48a0645e3df"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_6bb58f2b6e30cb51a6504599f41"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "refundDetails"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "refundDate"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "refundReference"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "refundedAmount"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "isRefunded"`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."paymentProvider" IS 'Payment provider for this user'`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "paymentProvider"`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."paystackAccountStatus" IS 'DVA account status'`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "paystackAccountStatus"`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."paystackDedicatedAccountId" IS 'Paystack dedicated account ID'`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "paystackDedicatedAccountId"`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."paystackCustomerCode" IS 'Paystack customer code'`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "paystackCustomerCode"`);
        await queryRunner.query(`COMMENT ON COLUMN "businesses"."settlementSchedule" IS 'Settlement schedule for this business'`);
        await queryRunner.query(`ALTER TABLE "businesses" DROP COLUMN "settlementSchedule"`);
        await queryRunner.query(`COMMENT ON COLUMN "businesses"."isSubaccountActive" IS 'Whether subaccount is verified and active'`);
        await queryRunner.query(`ALTER TABLE "businesses" DROP COLUMN "isSubaccountActive"`);
        await queryRunner.query(`COMMENT ON COLUMN "businesses"."revenueSharePercentage" IS 'Percentage business receives from sales (100 - platform fee)'`);
        await queryRunner.query(`ALTER TABLE "businesses" DROP COLUMN "revenueSharePercentage"`);
        await queryRunner.query(`COMMENT ON COLUMN "businesses"."paystackSubaccountCode" IS 'Paystack subaccount code for split payments'`);
        await queryRunner.query(`ALTER TABLE "businesses" DROP COLUMN "paystackSubaccountCode"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_85d65d236f62b4496cd115f097"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e744417ceb0b530285c08f3865"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_da87c55b3bbbe96c6ed88ea7ee"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2d5fa024a84dceb158b2b95f34"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2fdbbae70ff802bc8b703ee7c5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9f24c9c8611e077a48a0645e3d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6bb58f2b6e30cb51a6504599f4"`);
        await queryRunner.query(`DROP TABLE "transactions"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_flow_enum"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_type_enum"`);
    }

}
