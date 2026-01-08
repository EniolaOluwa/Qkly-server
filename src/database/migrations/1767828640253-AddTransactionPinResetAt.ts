import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTransactionPinResetAt1767828640253 implements MigrationInterface {
    name = 'AddTransactionPinResetAt1767828640253'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."system_configs_datatype_enum" AS ENUM('STRING', 'NUMBER', 'BOOLEAN', 'JSON')`);
        await queryRunner.query(`CREATE TABLE "system_configs" ("key" character varying NOT NULL, "value" text NOT NULL, "description" character varying, "dataType" "public"."system_configs_datatype_enum" NOT NULL DEFAULT 'STRING', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5aff9a6d272a5cedf54d7aaf617" PRIMARY KEY ("key"))`);
        await queryRunner.query(`ALTER TABLE "user_security" ADD "transactionPinResetAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TYPE "public"."otps_purpose_enum" RENAME TO "otps_purpose_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."otps_purpose_enum" AS ENUM('phone_verification', 'password_reset', 'email_verification', 'pin_creation', 'transaction_pin_reset')`);
        await queryRunner.query(`ALTER TABLE "otps" ALTER COLUMN "purpose" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "otps" ALTER COLUMN "purpose" TYPE "public"."otps_purpose_enum" USING "purpose"::"text"::"public"."otps_purpose_enum"`);
        await queryRunner.query(`ALTER TABLE "otps" ALTER COLUMN "purpose" SET DEFAULT 'phone_verification'`);
        await queryRunner.query(`DROP TYPE "public"."otps_purpose_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."otps_purpose_enum_old" AS ENUM('phone_verification', 'password_reset', 'email_verification', 'pin_creation')`);
        await queryRunner.query(`ALTER TABLE "otps" ALTER COLUMN "purpose" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "otps" ALTER COLUMN "purpose" TYPE "public"."otps_purpose_enum_old" USING "purpose"::"text"::"public"."otps_purpose_enum_old"`);
        await queryRunner.query(`ALTER TABLE "otps" ALTER COLUMN "purpose" SET DEFAULT 'phone_verification'`);
        await queryRunner.query(`DROP TYPE "public"."otps_purpose_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."otps_purpose_enum_old" RENAME TO "otps_purpose_enum"`);
        await queryRunner.query(`ALTER TABLE "user_security" DROP COLUMN "transactionPinResetAt"`);
        await queryRunner.query(`DROP TABLE "system_configs"`);
        await queryRunner.query(`DROP TYPE "public"."system_configs_datatype_enum"`);
    }

}
