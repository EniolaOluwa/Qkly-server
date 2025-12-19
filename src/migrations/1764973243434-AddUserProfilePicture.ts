import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserProfilePicture1764975822164 implements MigrationInterface {
  name = 'AddUserProfilePicture1764975822164';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "profile_picture" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "profile_picture"
    `);
  }
}
