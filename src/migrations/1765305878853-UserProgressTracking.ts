import { MigrationInterface, QueryRunner } from "typeorm";

export class UserProgressTracking1765305878853 implements MigrationInterface {
    name = 'UserProgressTracking1765305878853'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_78725ac7117e7526e028014606"`);
        await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT "FK_cdb99c05982d5191ac8465ac01f"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_1e6c554d615dd5a5bf0e11ee0ef"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_53a68dc905777554b7f702791fd"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_a6b3c434392f5d10ec17104366b"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_d17ce9c119d29c7ec8c884044c7"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_7ed5659e7139fc8bc039198cc1e"`);
        await queryRunner.query(`ALTER TABLE "lead-forms" DROP CONSTRAINT "FK_leadforms_businessId"`);
        await queryRunner.query(`ALTER TABLE "leads" DROP CONSTRAINT "FK_leads_businessId"`);
        await queryRunner.query(`ALTER TABLE "leads" DROP CONSTRAINT "FK_leads_formId"`);
        await queryRunner.query(`CREATE TYPE "public"."user_progress_event_enum" AS ENUM('TRANSACTION_PIN_CREATED', 'FIRST_PRODUCT_CREATED', 'BUSINESS_INFO_UPDATED', 'BUSINESS_LINK_SHARED')`);
        await queryRunner.query(`CREATE TABLE "user_progress" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "event" "public"."user_progress_event_enum" NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7b5eb2436efb0051fdf05cbe839" PRIMARY KEY ("id")); COMMENT ON COLUMN "user_progress"."event" IS 'Type of progress milestone'`);
        await queryRunner.query(`CREATE TABLE "store_visits" ("id" SERIAL NOT NULL, "businessId" integer NOT NULL, "trafficSource" character varying, "referrer" character varying, "utmSource" character varying, "utmMedium" character varying, "utmCampaign" character varying, "userAgent" character varying, "ipAddress" character varying, "sessionId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b7ae8f7ee9d60e6070d49794878" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_feb5033ab8862c0d4bc3667c34" ON "store_visits" ("businessId") `);
        await queryRunner.query(`CREATE INDEX "IDX_2938b59f732a77d58d7a5665b5" ON "store_visits" ("trafficSource") `);
        await queryRunner.query(`CREATE INDEX "IDX_2938b59f732a77d58d7a5665b5" ON "store_visits" ("trafficSource") `);
        await queryRunner.query(`CREATE INDEX "IDX_e5125fa350fd0da092278a5545" ON "store_visits" ("businessId", "createdAt") `);
        await queryRunner.query(`CREATE TABLE "devices" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "deviceName" character varying, "osType" character varying, "osVersion" character varying, "deviceType" character varying, "referralUrl" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b1514758245c12daf43486dd1f0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "lead-forms_id_seq" OWNED BY "lead-forms"."id"`);
        await queryRunner.query(`ALTER TABLE "lead-forms" ALTER COLUMN "id" SET DEFAULT nextval('"lead-forms_id_seq"')`);
        await queryRunner.query(`ALTER TABLE "lead-forms" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "leads_id_seq" OWNED BY "leads"."id"`);
        await queryRunner.query(`ALTER TABLE "leads" ALTER COLUMN "id" SET DEFAULT nextval('"leads_id_seq"')`);
        await queryRunner.query(`ALTER TABLE "leads" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "leads" ALTER COLUMN "formId" SET NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_19a7638af058ba9a727b100869" ON "orders" ("customerEmail") `);
        await queryRunner.query(`CREATE INDEX "IDX_19a7638af058ba9a727b100869" ON "orders" ("customerEmail") `);
        await queryRunner.query(`ALTER TABLE "user_progress" ADD CONSTRAINT "FK_b5d0e1b57bc6c761fb49e79bf89" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "leads" ADD CONSTRAINT "FK_08e50b251ecb4417800af268b26" FOREIGN KEY ("formId") REFERENCES "lead-forms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "leads" ADD CONSTRAINT "FK_daf8eb3d52d018ea43df6d5edab" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "store_visits" ADD CONSTRAINT "FK_feb5033ab8862c0d4bc3667c343" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "devices" ADD CONSTRAINT "FK_e8a5d59f0ac3040395f159507c6" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "devices" DROP CONSTRAINT "FK_e8a5d59f0ac3040395f159507c6"`);
        await queryRunner.query(`ALTER TABLE "store_visits" DROP CONSTRAINT "FK_feb5033ab8862c0d4bc3667c343"`);
        await queryRunner.query(`ALTER TABLE "leads" DROP CONSTRAINT "FK_daf8eb3d52d018ea43df6d5edab"`);
        await queryRunner.query(`ALTER TABLE "leads" DROP CONSTRAINT "FK_08e50b251ecb4417800af268b26"`);
        await queryRunner.query(`ALTER TABLE "user_progress" DROP CONSTRAINT "FK_b5d0e1b57bc6c761fb49e79bf89"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_19a7638af058ba9a727b100869"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_19a7638af058ba9a727b100869"`);
        await queryRunner.query(`ALTER TABLE "leads" ALTER COLUMN "formId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "leads" ALTER COLUMN "id" SET DEFAULT nextval('leads_id_new_seq')`);
        await queryRunner.query(`ALTER TABLE "leads" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`DROP SEQUENCE "leads_id_seq"`);
        await queryRunner.query(`ALTER TABLE "lead-forms" ALTER COLUMN "id" SET DEFAULT nextval('"lead-forms_id_new_seq"')`);
        await queryRunner.query(`ALTER TABLE "lead-forms" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`DROP SEQUENCE "lead-forms_id_seq"`);
        await queryRunner.query(`DROP TABLE "devices"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e5125fa350fd0da092278a5545"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2938b59f732a77d58d7a5665b5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2938b59f732a77d58d7a5665b5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_feb5033ab8862c0d4bc3667c34"`);
        await queryRunner.query(`DROP TABLE "store_visits"`);
        await queryRunner.query(`DROP TABLE "user_progress"`);
        await queryRunner.query(`DROP TYPE "public"."user_progress_event_enum"`);
        await queryRunner.query(`ALTER TABLE "leads" ADD CONSTRAINT "FK_leads_formId" FOREIGN KEY ("formId") REFERENCES "lead-forms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "leads" ADD CONSTRAINT "FK_leads_businessId" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lead-forms" ADD CONSTRAINT "FK_leadforms_businessId" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_7ed5659e7139fc8bc039198cc1e" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_d17ce9c119d29c7ec8c884044c7" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_a6b3c434392f5d10ec17104366b" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_53a68dc905777554b7f702791fd" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_1e6c554d615dd5a5bf0e11ee0ef" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_items" ADD CONSTRAINT "FK_cdb99c05982d5191ac8465ac01f" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_78725ac7117e7526e028014606" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
