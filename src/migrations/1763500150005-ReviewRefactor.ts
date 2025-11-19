import { MigrationInterface, QueryRunner } from "typeorm";

export class ReviewRefactor1763500150005 implements MigrationInterface {
    name = 'ReviewRefactor1763500150005'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reviews" ADD "guestName" character varying`);
        await queryRunner.query(`COMMENT ON COLUMN "reviews"."guestName" IS 'Guest reviewer name (when userId is null)'`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD "guestEmail" character varying`);
        await queryRunner.query(`COMMENT ON COLUMN "reviews"."guestEmail" IS 'Guest reviewer email (when userId is null)'`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD "guestPhone" character varying`);
        await queryRunner.query(`COMMENT ON COLUMN "reviews"."guestPhone" IS 'Guest reviewer phone (when userId is null)'`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_151b79a83ba240b0cb31b2302d1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5025e0259ec0b1ffb5f0ea6685"`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "userId" DROP NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_5025e0259ec0b1ffb5f0ea6685" ON "orders" ("userId", "businessId") `);
        await queryRunner.query(`CREATE INDEX "IDX_058c6448644b27a8e63fd03106" ON "reviews" ("guestEmail") `);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_151b79a83ba240b0cb31b2302d1" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_151b79a83ba240b0cb31b2302d1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_058c6448644b27a8e63fd03106"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5025e0259ec0b1ffb5f0ea6685"`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "userId" SET NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_5025e0259ec0b1ffb5f0ea6685" ON "orders" ("userId", "businessId") `);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_151b79a83ba240b0cb31b2302d1" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`COMMENT ON COLUMN "reviews"."guestPhone" IS 'Guest reviewer phone (when userId is null)'`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "guestPhone"`);
        await queryRunner.query(`COMMENT ON COLUMN "reviews"."guestEmail" IS 'Guest reviewer email (when userId is null)'`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "guestEmail"`);
        await queryRunner.query(`COMMENT ON COLUMN "reviews"."guestName" IS 'Guest reviewer name (when userId is null)'`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "guestName"`);
    }

}
