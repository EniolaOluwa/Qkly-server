import { MigrationInterface, QueryRunner } from "typeorm";

export class EnhanceUserKYC1766890182133 implements MigrationInterface {
    name = 'EnhanceUserKYC1766890182133'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."user_kyc_tier_enum" AS ENUM('tier_1', 'tier_2', 'tier_3')`);
        await queryRunner.query(`ALTER TABLE "user_kyc" ADD "tier" "public"."user_kyc_tier_enum" NOT NULL DEFAULT 'tier_1'`);
        await queryRunner.query(`ALTER TABLE "user_kyc" ADD "idType" character varying`);
        await queryRunner.query(`ALTER TABLE "user_kyc" ADD "idNumber" character varying`);
        await queryRunner.query(`ALTER TABLE "user_kyc" ADD "idImageUrl" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_kyc" DROP COLUMN "idImageUrl"`);
        await queryRunner.query(`ALTER TABLE "user_kyc" DROP COLUMN "idNumber"`);
        await queryRunner.query(`ALTER TABLE "user_kyc" DROP COLUMN "idType"`);
        await queryRunner.query(`ALTER TABLE "user_kyc" DROP COLUMN "tier"`);
        await queryRunner.query(`DROP TYPE "public"."user_kyc_tier_enum"`);
    }

}
