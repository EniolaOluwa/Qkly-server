import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPurposeToOtp1700000000000 implements MigrationInterface {
  name = 'AddPurposeToOtp1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the enum type if it doesn't exist
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "otp_purpose_enum" AS ENUM('phone_verification', 'password_reset', 'email_verification');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Check if purpose column already exists
    const hasColumn = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'otps' AND column_name = 'purpose'
    `);

    // Add the purpose column only if it doesn't exist
    if (hasColumn.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "otps" 
        ADD COLUMN "purpose" "otp_purpose_enum" NOT NULL DEFAULT 'phone_verification'
      `);
    } else {
      console.log('Purpose column already exists, skipping column creation');

      // Ensure the column has the correct type and default (in case it was created differently)
      await queryRunner.query(`
        ALTER TABLE "otps" 
        ALTER COLUMN "purpose" SET DEFAULT 'phone_verification'
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the purpose column
    await queryRunner.query(`ALTER TABLE "otps" DROP COLUMN "purpose"`);

    // Drop the enum type (only if no other columns are using it)
    await queryRunner.query(`DROP TYPE IF EXISTS "otp_purpose_enum"`);
  }
}
