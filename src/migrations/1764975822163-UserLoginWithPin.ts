import { MigrationInterface, QueryRunner } from "typeorm";

export class UserLoginWithPin1764975822163 implements MigrationInterface {
    name = 'UserLoginWithPin1764975822163'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "pinFailedAttempts" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "pinLockedUntil" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "pinLockedUntil"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "pinFailedAttempts"`);
    }

}
