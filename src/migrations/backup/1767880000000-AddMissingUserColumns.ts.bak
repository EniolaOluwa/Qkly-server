import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingUserColumns1767880000000 implements MigrationInterface {
  name = 'AddMissingUserColumns1767880000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if columns exist before adding them
    const table = await queryRunner.getTable('users');
    
    if (!table) {
      console.warn('Users table not found');
      return;
    }

    // Add personalAccountNumber column if it doesn't exist
    if (!table.findColumnByName('personalAccountNumber')) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD "personalAccountNumber" character varying`,
      );
      await queryRunner.query(
        `COMMENT ON COLUMN "users"."personalAccountNumber" IS 'User''s preferred bank account number for payouts'`,
      );
    }

    // Add personalAccountName column if it doesn't exist
    if (!table.findColumnByName('personalAccountName')) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD "personalAccountName" character varying`,
      );
      await queryRunner.query(
        `COMMENT ON COLUMN "users"."personalAccountName" IS 'User''s preferred bank account name for payouts'`,
      );
    }

    // Add personalBankName column if it doesn't exist
    if (!table.findColumnByName('personalBankName')) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD "personalBankName" character varying`,
      );
      await queryRunner.query(
        `COMMENT ON COLUMN "users"."personalBankName" IS 'User''s preferred bank name for payouts'`,
      );
    }

    // Add personalBankCode column if it doesn't exist
    if (!table.findColumnByName('personalBankCode')) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD "personalBankCode" character varying`,
      );
      await queryRunner.query(
        `COMMENT ON COLUMN "users"."personalBankCode" IS 'User''s preferred bank code for payouts'`,
      );
    }

    // Add walletAccountNumber column if it doesn't exist
    if (!table.findColumnByName('walletAccountNumber')) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD "walletAccountNumber" character varying`,
      );
      await queryRunner.query(
        `COMMENT ON COLUMN "users"."walletAccountNumber" IS 'Monnify wallet account number'`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');

    if (!table) {
      console.warn('Users table not found');
      return;
    }

    if (table.findColumnByName('personalAccountNumber')) {
      await queryRunner.query(
        `ALTER TABLE "users" DROP COLUMN "personalAccountNumber"`,
      );
    }

    if (table.findColumnByName('personalAccountName')) {
      await queryRunner.query(
        `ALTER TABLE "users" DROP COLUMN "personalAccountName"`,
      );
    }

    if (table.findColumnByName('personalBankName')) {
      await queryRunner.query(
        `ALTER TABLE "users" DROP COLUMN "personalBankName"`,
      );
    }

    if (table.findColumnByName('personalBankCode')) {
      await queryRunner.query(
        `ALTER TABLE "users" DROP COLUMN "personalBankCode"`,
      );
    }

    if (table.findColumnByName('walletAccountNumber')) {
      await queryRunner.query(
        `ALTER TABLE "users" DROP COLUMN "walletAccountNumber"`,
      );
    }
  }
}
