import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdatePhoneLength1762280827096 implements MigrationInterface {
    name = 'UpdatePhoneLength1762280827096'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop old constraint and column
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "UQ_a000cca60bcf04454e727699490"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "phone"`);

        // Add the column with a DEFAULT first (so existing rows can accept it)
        await queryRunner.query(`ALTER TABLE "users" ADD "phone" character varying(20) DEFAULT ''`);

        // Fill any NULL values just in case
        await queryRunner.query(`UPDATE "users" SET "phone" = '' WHERE "phone" IS NULL`);

        // Now enforce NOT NULL and UNIQUE constraint
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "phone" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_a000cca60bcf04454e727699490" UNIQUE ("phone")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "UQ_a000cca60bcf04454e727699490"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "phone"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "phone" character varying(13) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_a000cca60bcf04454e727699490" UNIQUE ("phone")`);
    }
}
