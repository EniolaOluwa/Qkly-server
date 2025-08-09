import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLogoToBusinesses1754731870417 implements MigrationInterface {
    name = 'AddLogoToBusinesses1754731870417'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "businesses" ADD "logo" character varying`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."onboardingStep" IS 'Current onboarding step for the user (0: Personal Info, 1: Phone Verification, 2: Business Info, 3: KYC, 4: PIN)'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`COMMENT ON COLUMN "users"."onboardingStep" IS 'Current onboarding step for the user'`);
        await queryRunner.query(`ALTER TABLE "businesses" DROP COLUMN "logo"`);
    }

}
