import { MigrationInterface, QueryRunner } from "typeorm";

export class StoreSlugGeneration1765399011067 implements MigrationInterface {
    name = 'StoreSlugGeneration1765399011067'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "businesses" ADD "slug" character varying`);
        await queryRunner.query(`ALTER TABLE "businesses" ADD CONSTRAINT "UQ_82ca19bc20713fdfa72626a5da0" UNIQUE ("slug")`);
        await queryRunner.query(`ALTER TABLE "businesses" ADD CONSTRAINT "UQ_6972aa4a4d17d2d31f79c0b8967" UNIQUE ("storeName")`);
        await queryRunner.query(`CREATE INDEX "IDX_business_slug" ON "businesses" ("slug") `);
        await queryRunner.query(`CREATE INDEX "IDX_business_storeName" ON "businesses" ("storeName") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_business_storeName"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_business_slug"`);
    }
}
