import { MigrationInterface, QueryRunner } from "typeorm";

export class CartAbandonmentAndLeadNotifications1766741618419 implements MigrationInterface {
    name = 'CartAbandonmentAndLeadNotifications1766741618419'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bank_accounts" ADD "currency" character varying(3) NOT NULL DEFAULT 'NGN'`);
        await queryRunner.query(`ALTER TABLE "bank_accounts" ADD "isDeleted" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "products" ADD "lowStockThreshold" integer NOT NULL DEFAULT '5'`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "cartId" integer`);
        await queryRunner.query(`CREATE INDEX "IDX_d7b6b269e131a5287bd05da4a5" ON "orders" ("cartId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_d7b6b269e131a5287bd05da4a5"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "cartId"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "lowStockThreshold"`);
        await queryRunner.query(`ALTER TABLE "bank_accounts" DROP COLUMN "isDeleted"`);
        await queryRunner.query(`ALTER TABLE "bank_accounts" DROP COLUMN "currency"`);
    }

}
