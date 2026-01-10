import { MigrationInterface, QueryRunner } from "typeorm";

export class ShipBubbleIntegration1768045610575 implements MigrationInterface {
    name = 'ShipBubbleIntegration1768045610575'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_order_status_history_status_createdAt"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_order_status_history_previousStatus"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_webhook_events_provider_eventId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_webhook_events_eventType"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_webhook_events_processed"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_webhook_events_createdAt"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_webhook_events_reference"`);
        await queryRunner.query(`COMMENT ON TABLE "webhook_events" IS NULL`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "shippingMetadata" jsonb`);
        await queryRunner.query(`CREATE INDEX "IDX_564ab635197b28a34b2d173287" ON "webhook_events" ("createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_7c2f5f461ca00d421976e458ff" ON "webhook_events" ("processed") `);
        await queryRunner.query(`CREATE INDEX "IDX_9012f488eab3c3bc17ce56f9b8" ON "webhook_events" ("eventType") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_98f2cff1929323fc1166e80938" ON "webhook_events" ("provider", "eventId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_98f2cff1929323fc1166e80938"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9012f488eab3c3bc17ce56f9b8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7c2f5f461ca00d421976e458ff"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_564ab635197b28a34b2d173287"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "shippingMetadata"`);
        await queryRunner.query(`COMMENT ON TABLE "webhook_events" IS 'Tracks all webhook events for idempotency and audit. Prevents duplicate processing of webhooks from payment providers.'`);
        await queryRunner.query(`CREATE INDEX "IDX_webhook_events_reference" ON "webhook_events" ("reference") `);
        await queryRunner.query(`CREATE INDEX "IDX_webhook_events_createdAt" ON "webhook_events" ("createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_webhook_events_processed" ON "webhook_events" ("processed") `);
        await queryRunner.query(`CREATE INDEX "IDX_webhook_events_eventType" ON "webhook_events" ("eventType") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_webhook_events_provider_eventId" ON "webhook_events" ("provider", "eventId") `);
        await queryRunner.query(`CREATE INDEX "IDX_order_status_history_previousStatus" ON "order_status_history" ("previousStatus") `);
        await queryRunner.query(`CREATE INDEX "IDX_order_status_history_status_createdAt" ON "order_status_history" ("status", "createdAt") `);
    }

}
