import { MigrationInterface, QueryRunner } from "typeorm";

export class BusinessTrafficTracking1765391034679 implements MigrationInterface {
    name = "BusinessTrafficTracking1765391034679";

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create ENUM for traffic sources
        await queryRunner.query(`
      CREATE TYPE "public"."traffic_events_source_enum" AS ENUM(
        'google', 'facebook', 'instagram', 'whatsapp', 'tiktok', 'twitter',
        'snapchat', 'bing', 'youtube', 'chatgpt', 'claude', 'gemini', 'grok',
        'direct', 'other'
      )
    `);

        // Traffic Events table
        await queryRunner.query(`
      CREATE TABLE "traffic_events" (
        "id" SERIAL NOT NULL,
        "businessId" integer NOT NULL,
        "referralUrl" character varying,
        "landingPage" character varying,
        "source" "public"."traffic_events_source_enum" NOT NULL DEFAULT 'direct',
        "ipAddress" character varying,
        "userAgent" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_traffic_events_id" PRIMARY KEY ("id")
      )
    `);

        // Store Visits table
        await queryRunner.query(`
      CREATE TABLE "store_visits" (
        "id" SERIAL NOT NULL,
        "businessId" integer NOT NULL,
        "trafficSource" character varying,
        "referrer" character varying,
        "utmSource" character varying,
        "utmMedium" character varying,
        "utmCampaign" character varying,
        "userAgent" character varying,
        "ipAddress" character varying,
        "sessionId" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_store_visits_id" PRIMARY KEY ("id")
      )
    `);

        // Indexes
        await queryRunner.query(`CREATE INDEX "IDX_store_visits_business" ON "store_visits" ("businessId")`);
        await queryRunner.query(`CREATE INDEX "IDX_store_visits_trafficSource" ON "store_visits" ("trafficSource")`);
        await queryRunner.query(`CREATE INDEX "IDX_store_visits_business_createdAt" ON "store_visits" ("businessId", "createdAt")`);

        // Sequence fixes
        await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "lead-forms_id_seq" OWNED BY "lead-forms"."id"`);
        await queryRunner.query(`ALTER TABLE "lead-forms" ALTER COLUMN "id" SET DEFAULT nextval('"lead-forms_id_seq"')`);
        await queryRunner.query(`ALTER TABLE "lead-forms" ALTER COLUMN "id" DROP DEFAULT`);

        await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "leads_id_seq" OWNED BY "leads"."id"`);
        await queryRunner.query(`ALTER TABLE "leads" ALTER COLUMN "id" SET DEFAULT nextval('"leads_id_seq"')`);
        await queryRunner.query(`ALTER TABLE "leads" ALTER COLUMN "id" DROP DEFAULT`);

        await queryRunner.query(`ALTER TABLE "leads" ALTER COLUMN "formId" SET NOT NULL`);

        // Orders index
        await queryRunner.query(`CREATE INDEX "IDX_orders_customerEmail" ON "orders" ("customerEmail")`);

        // Re-add FKs
        await queryRunner.query(`
      ALTER TABLE "traffic_events"
      ADD CONSTRAINT "FK_traffic_events_businessId"
      FOREIGN KEY ("businessId") REFERENCES "businesses"("id")
      ON DELETE CASCADE
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop tables
        await queryRunner.query(`DROP TABLE "traffic_events"`);
    }
}
