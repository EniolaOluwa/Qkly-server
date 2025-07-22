import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateOrderProductDetails1700000002000 implements MigrationInterface {
  name = 'UpdateOrderProductDetails1700000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update productDetails column to be NOT NULL and update comment
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "productDetails" SET NOT NULL`,
    );
    
    await queryRunner.query(
      `COMMENT ON COLUMN "orders"."productDetails" IS 'Array of product details including product ID, quantity, and colour'`,
    );

    // Remove the productId column
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "productId"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back the productId column
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "productId" integer`,
    );

    // Make productDetails column nullable again
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "productDetails" DROP NOT NULL`,
    );
  }
} 