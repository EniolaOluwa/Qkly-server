import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStoreFrontColumnsToBusinesses1763585615121 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add store-front columns to businesses table
    await queryRunner.query(`ALTER TABLE "businesses" ADD "coverImage" character varying`);
    await queryRunner.query(`ALTER TABLE "businesses" ADD "storeName" character varying`);
    await queryRunner.query(`ALTER TABLE "businesses" ADD "heroText" character varying`);
    await queryRunner.query(`ALTER TABLE "businesses" ADD "storeColor" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove store-front columns from businesses table
    await queryRunner.query(`ALTER TABLE "businesses" DROP COLUMN IF EXISTS "storeColor"`);
    await queryRunner.query(`ALTER TABLE "businesses" DROP COLUMN IF EXISTS "heroText"`);
    await queryRunner.query(`ALTER TABLE "businesses" DROP COLUMN IF EXISTS "storeName"`);
    await queryRunner.query(`ALTER TABLE "businesses" DROP COLUMN IF EXISTS "coverImage"`);
  }
}
