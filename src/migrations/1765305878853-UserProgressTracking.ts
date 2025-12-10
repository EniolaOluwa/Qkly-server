import { MigrationInterface, QueryRunner } from "typeorm";

export class UserProgressTracking1765305878853 implements MigrationInterface {
    name = 'UserProgressTracking1765305878853'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."user_progress_event_enum" AS ENUM('TRANSACTION_PIN_CREATED', 'FIRST_PRODUCT_CREATED', 'BUSINESS_INFO_UPDATED', 'BUSINESS_LINK_SHARED')`);
        await queryRunner.query(`CREATE TABLE "user_progress" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "event" "public"."user_progress_event_enum" NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7b5eb2436efb0051fdf05cbe839" PRIMARY KEY ("id")); COMMENT ON COLUMN "user_progress"."event" IS 'Type of progress milestone'`);
        await queryRunner.query(`ALTER TABLE "user_progress" ADD CONSTRAINT "FK_b5d0e1b57bc6c761fb49e79bf89" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {

        await queryRunner.query(`ALTER TABLE "user_progress" DROP CONSTRAINT "FK_b5d0e1b57bc6c761fb49e79bf89"`);
        await queryRunner.query(`DROP TABLE "user_progress"`);
        await queryRunner.query(`DROP TYPE "public"."user_progress_event_enum"`);
    }

}
