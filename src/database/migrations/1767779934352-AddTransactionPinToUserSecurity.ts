import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTransactionPinToUserSecurity1767779934352 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_security" ADD "transactionPin" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "user_security" ADD "transactionPinFailedAttempts" integer DEFAULT 0 NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user_security" ADD "transactionPinLockedUntil" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "user_security" ADD "transactionPinChangedAt" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_security" DROP COLUMN "transactionPinLockedUntil"`);
        await queryRunner.query(`ALTER TABLE "user_security" DROP COLUMN "transactionPinFailedAttempts"`);
        await queryRunner.query(`ALTER TABLE "user_security" DROP COLUMN "transactionPin"`);
    }

}
