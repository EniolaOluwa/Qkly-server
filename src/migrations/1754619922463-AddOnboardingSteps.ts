import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOnboardingSteps1754619922463 implements MigrationInterface {
    name = 'AddOnboardingSteps1754619922463'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."users_onboardingstep_enum" AS ENUM('0', '1', '2', '3', '4')`);
        await queryRunner.query(`ALTER TABLE "users" ADD "onboardingStep" "public"."users_onboardingstep_enum" NOT NULL DEFAULT '0'`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."onboardingStep" IS 'Current onboarding step for the user'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "isOnboardingCompleted" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."isOnboardingCompleted" IS 'Whether user has completed all onboarding steps'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`COMMENT ON COLUMN "users"."isOnboardingCompleted" IS 'Whether user has completed all onboarding steps'`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "isOnboardingCompleted"`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."onboardingStep" IS 'Current onboarding step for the user'`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "onboardingStep"`);
        await queryRunner.query(`DROP TYPE "public"."users_onboardingstep_enum"`);
    }

}
