import { MigrationInterface, QueryRunner } from "typeorm";

export class ConsolidatePhoneVerification1766732360000 implements MigrationInterface {
  name = 'ConsolidatePhoneVerification1766732360000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Sync data: Update user_profiles.isPhoneVerified from users.isPhoneVerified
    await queryRunner.query(`
            UPDATE "user_profiles"
            SET "isPhoneVerified" = "users"."isPhoneVerified"
            FROM "users"
            WHERE "user_profiles"."userId" = "users"."id"
            AND "users"."isPhoneVerified" = true
        `);

    // 2. Drop the column from users table
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "isPhoneVerified"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Restore the column
    await queryRunner.query(`ALTER TABLE "users" ADD "isPhoneVerified" boolean NOT NULL DEFAULT false`);

    // 2. Restore data (reverse sync)
    await queryRunner.query(`
            UPDATE "users"
            SET "isPhoneVerified" = "user_profiles"."isPhoneVerified"
            FROM "user_profiles"
            WHERE "users"."id" = "user_profiles"."userId"
        `);
  }
}
