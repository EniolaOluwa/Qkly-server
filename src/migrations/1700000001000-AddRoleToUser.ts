import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRoleToUser1700000001000 implements MigrationInterface {
  name = 'AddRoleToUser1700000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM('merchant', 'admin')
    `);
    
    await queryRunner.query(`
      ALTER TABLE "users" ADD "role" "user_role_enum" NOT NULL DEFAULT 'merchant'
    `);
    
    await queryRunner.query(`
      COMMENT ON COLUMN "users"."role" IS 'User role: merchant or admin'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "role"
    `);
    
    await queryRunner.query(`
      DROP TYPE "user_role_enum"
    `);
  }
} 