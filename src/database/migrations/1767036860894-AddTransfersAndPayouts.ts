import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTransfersAndPayouts1767036860894 implements MigrationInterface {
    name = 'AddTransfersAndPayouts1767036860894'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."transfers_status_enum" AS ENUM('SUCCESS', 'PENDING', 'OTP_REQUIRED', 'FAILED', 'REVERSED')`);
        await queryRunner.query(`CREATE TABLE "transfers" ("id" SERIAL NOT NULL, "userId" integer, "businessId" integer, "reference" character varying NOT NULL, "transferCode" character varying, "amount" numeric(12,2) NOT NULL, "currency" character varying NOT NULL DEFAULT 'NGN', "recipientCode" character varying NOT NULL, "recipientAccountNumber" character varying, "recipientBankCode" character varying, "recipientName" character varying, "narration" character varying, "status" "public"."transfers_status_enum" NOT NULL DEFAULT 'PENDING', "providerResponse" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f712e908b465e0085b4408cabc3" PRIMARY KEY ("id"))`);
        // await queryRunner.query(`ALTER TABLE "business_payment_accounts" ADD "accountName" character varying`);
        // await queryRunner.query(`ALTER TABLE "business_payment_accounts" ADD "bankName" character varying`);
        // await queryRunner.query(`ALTER TABLE "business_payment_accounts" ADD "accountNumber" character varying`);
        await queryRunner.query(`ALTER TYPE "public"."transactions_type_enum" RENAME TO "transactions_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."transactions_type_enum" AS ENUM('ORDER_PAYMENT', 'SETTLEMENT', 'WITHDRAWAL', 'REFUND', 'WALLET_FUNDING', 'PAYOUT', 'FEE')`);
        await queryRunner.query(`ALTER TABLE "transactions" ALTER COLUMN "type" TYPE "public"."transactions_type_enum" USING "type"::"text"::"public"."transactions_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_type_enum_old"`);
        await queryRunner.query(`ALTER TABLE "transfers" ADD CONSTRAINT "FK_46bdc5962269c3679be53ee9257" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transfers" ADD CONSTRAINT "FK_237cfae000f524ceae3f721fd1b" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transfers" DROP CONSTRAINT "FK_237cfae000f524ceae3f721fd1b"`);
        await queryRunner.query(`ALTER TABLE "transfers" DROP CONSTRAINT "FK_46bdc5962269c3679be53ee9257"`);
        await queryRunner.query(`CREATE TYPE "public"."transactions_type_enum_old" AS ENUM('ORDER_PAYMENT', 'SETTLEMENT', 'WITHDRAWAL', 'REFUND', 'WALLET_FUNDING', 'FEE')`);
        await queryRunner.query(`ALTER TABLE "transactions" ALTER COLUMN "type" TYPE "public"."transactions_type_enum_old" USING "type"::"text"::"public"."transactions_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."transactions_type_enum_old" RENAME TO "transactions_type_enum"`);
        await queryRunner.query(`ALTER TABLE "business_payment_accounts" DROP COLUMN "accountNumber"`);
        await queryRunner.query(`ALTER TABLE "business_payment_accounts" DROP COLUMN "bankName"`);
        await queryRunner.query(`ALTER TABLE "business_payment_accounts" DROP COLUMN "accountName"`);
        await queryRunner.query(`DROP TABLE "transfers"`);
        await queryRunner.query(`DROP TYPE "public"."transfers_status_enum"`);
    }

}
