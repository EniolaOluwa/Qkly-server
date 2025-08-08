import { MigrationInterface, QueryRunner } from "typeorm";

export class ExpandOtpFieldForResetTokens1754663520528 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Expand the OTP field from 6 characters to 50 characters to accommodate UUID reset tokens
        await queryRunner.query(`ALTER TABLE "otps" ALTER COLUMN "otp" TYPE VARCHAR(50)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert back to 6 characters (this may fail if there are longer tokens in the DB)
        await queryRunner.query(`ALTER TABLE "otps" ALTER COLUMN "otp" TYPE VARCHAR(6)`);
    }

}
