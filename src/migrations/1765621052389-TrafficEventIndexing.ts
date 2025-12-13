import { MigrationInterface, QueryRunner } from "typeorm";

export class TrafficEventIndexing1765621052389 implements MigrationInterface {
    name = 'TrafficEventIndexing1765621052389'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "traffic_events" DROP CONSTRAINT "FK_traffic_events_businessId"`);
        await queryRunner.query(`CREATE INDEX "IDX_TRAFFIC_BUSINESS_SOURCE" ON "traffic_events" ("businessId", "source") `);
        await queryRunner.query(`CREATE INDEX "IDX_TRAFFIC_BUSINESS_CREATED" ON "traffic_events" ("businessId", "createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_TRAFFIC_CREATED_AT" ON "traffic_events" ("createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_TRAFFIC_BUSINESS_ID" ON "traffic_events" ("businessId") `);
        await queryRunner.query(`ALTER TABLE "traffic_events" ADD CONSTRAINT "FK_ebd75e4b14dc54e168d0b48dd1e" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "traffic_events" DROP CONSTRAINT "FK_ebd75e4b14dc54e168d0b48dd1e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_TRAFFIC_BUSINESS_ID"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_TRAFFIC_CREATED_AT"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_TRAFFIC_BUSINESS_CREATED"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_TRAFFIC_BUSINESS_SOURCE"`);
        await queryRunner.query(`ALTER TABLE "traffic_events" DROP COLUMN "userAgent"`);
        await queryRunner.query(`ALTER TABLE "traffic_events" ADD "userAgent" character varying`);
        await queryRunner.query(`ALTER TABLE "traffic_events" ADD CONSTRAINT "FK_traffic_events_businessId" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
