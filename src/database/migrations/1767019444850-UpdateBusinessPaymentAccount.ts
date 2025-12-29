import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateBusinessPaymentAccount1767019444850 implements MigrationInterface {
    name = 'UpdateBusinessPaymentAccount1767019444850'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "business_payment_accounts" DROP COLUMN "provider"`);
        await queryRunner.query(`DROP TYPE "public"."business_payment_accounts_provider_enum"`);
        await queryRunner.query(`ALTER TABLE "business_payment_accounts" ADD "provider" character varying NOT NULL DEFAULT 'paystack'`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fc1905d33f79be3fd5c3049985"`);
        await queryRunner.query(`ALTER TABLE "business_payment_accounts" DROP CONSTRAINT "UQ_fc1905d33f79be3fd5c30499856"`);
        await queryRunner.query(`ALTER TABLE "business_payment_accounts" DROP COLUMN "providerSubaccountCode"`);
        await queryRunner.query(`ALTER TABLE "business_payment_accounts" ADD "providerSubaccountCode" character varying`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_fc1905d33f79be3fd5c3049985" ON "business_payment_accounts" ("providerSubaccountCode") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_fc1905d33f79be3fd5c3049985"`);
        await queryRunner.query(`ALTER TABLE "business_payment_accounts" DROP COLUMN "providerSubaccountCode"`);
        await queryRunner.query(`ALTER TABLE "business_payment_accounts" ADD "providerSubaccountCode" character varying(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "business_payment_accounts" ADD CONSTRAINT "UQ_fc1905d33f79be3fd5c30499856" UNIQUE ("providerSubaccountCode")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_fc1905d33f79be3fd5c3049985" ON "business_payment_accounts" ("providerSubaccountCode") `);
        await queryRunner.query(`ALTER TABLE "business_payment_accounts" DROP COLUMN "provider"`);
        await queryRunner.query(`CREATE TYPE "public"."business_payment_accounts_provider_enum" AS ENUM('paystack')`);
        await queryRunner.query(`ALTER TABLE "business_payment_accounts" ADD "provider" "public"."business_payment_accounts_provider_enum" NOT NULL DEFAULT 'paystack'`);
    }

}
