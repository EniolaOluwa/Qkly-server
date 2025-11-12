import { MigrationInterface, QueryRunner } from "typeorm";

export class UserAccountNumberUpdate1762969976138 implements MigrationInterface {
    name = 'UserAccountNumberUpdate1762969976138'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "personalAccountNumber" character varying`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."personalAccountNumber" IS 'User’s preferred bank account number for payouts'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "personalAccountName" character varying`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."personalAccountName" IS 'User’s preferred bank account name for payouts'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "personalBankName" character varying`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."personalBankName" IS 'User’s preferred bank name for payouts'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "personalBankCode" character varying`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."personalBankCode" IS 'User’s preferred bank code for payouts'`);
        await queryRunner.query(`CREATE INDEX "IDX_775c9f06fc27ae3ff8fb26f2c4" ON "orders" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_01b20118a3f640214e7a8a6b29" ON "orders" ("paymentStatus") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_01b20118a3f640214e7a8a6b29"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_775c9f06fc27ae3ff8fb26f2c4"`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."personalBankCode" IS 'User’s preferred bank code for payouts'`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "personalBankCode"`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."personalBankName" IS 'User’s preferred bank name for payouts'`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "personalBankName"`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."personalAccountName" IS 'User’s preferred bank account name for payouts'`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "personalAccountName"`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."personalAccountNumber" IS 'User’s preferred bank account number for payouts'`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "personalAccountNumber"`);
    }

}
