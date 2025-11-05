import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSizeToProductsTable1762358518833 implements MigrationInterface {
    name = 'AddSizeToProductsTable1762358518833';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop old columns
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "productImages"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "productName"`);

        // Add new columns safely
        await queryRunner.query(`ALTER TABLE "products" ADD "images" text`);
        await queryRunner.query(`COMMENT ON COLUMN "products"."images" IS 'Array of image URLs'`);

        // Step 1: Add columns as nullable
        await queryRunner.query(`ALTER TABLE "products" ADD "name" character varying`);
        await queryRunner.query(`ALTER TABLE "products" ADD "description" text`);

        // Step 2: Backfill with safe defaults
        await queryRunner.query(`UPDATE "products" SET "name" = 'Unnamed Product' WHERE "name" IS NULL`);
        await queryRunner.query(`UPDATE "products" SET "description" = 'No description provided' WHERE "description" IS NULL`);

        // Step 3: Enforce NOT NULL constraint
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "name" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "description" SET NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Reverse operations
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "description"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "name"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "images"`);
        await queryRunner.query(`ALTER TABLE "products" ADD "productName" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "products" ADD "productImages" text`);
        await queryRunner.query(`COMMENT ON COLUMN "products"."productImages" IS 'Array of image URLs'`);
    }
}
