import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWebhookEventsAndImproveStatusHistory1736547000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create webhook_events table for idempotency tracking
    await queryRunner.query(`
      CREATE TABLE "webhook_events" (
        "id" SERIAL PRIMARY KEY,
        "provider" VARCHAR(50) NOT NULL,
        "eventId" VARCHAR(255) NOT NULL,
        "eventType" VARCHAR(100) NOT NULL,
        "reference" VARCHAR(255),
        "payload" JSONB NOT NULL,
        "processed" BOOLEAN NOT NULL DEFAULT false,
        "error" TEXT,
        "attempts" INTEGER NOT NULL DEFAULT 0,
        "processedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create unique index for idempotency (provider + eventId must be unique)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_webhook_events_provider_eventId"
      ON "webhook_events" ("provider", "eventId");
    `);

    // Create indexes for common queries
    await queryRunner.query(`
      CREATE INDEX "IDX_webhook_events_eventType"
      ON "webhook_events" ("eventType");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_webhook_events_processed"
      ON "webhook_events" ("processed");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_webhook_events_createdAt"
      ON "webhook_events" ("createdAt");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_webhook_events_reference"
      ON "webhook_events" ("reference");
    `);

    // Add comment to table for documentation
    await queryRunner.query(`
      COMMENT ON TABLE "webhook_events" IS
      'Tracks all webhook events for idempotency and audit. Prevents duplicate processing of webhooks from payment providers.';
    `);

    // Improve order_status_history table with additional indexes for performance
    // Check if indexes already exist before creating
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE indexname = 'IDX_order_status_history_status_createdAt'
        ) THEN
          CREATE INDEX "IDX_order_status_history_status_createdAt"
          ON "order_status_history" ("status", "createdAt");
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE indexname = 'IDX_order_status_history_previousStatus'
        ) THEN
          CREATE INDEX "IDX_order_status_history_previousStatus"
          ON "order_status_history" ("previousStatus");
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop order_status_history indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_order_status_history_status_createdAt";
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_order_status_history_previousStatus";
    `);

    // Drop webhook_events indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_webhook_events_reference";
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_webhook_events_createdAt";
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_webhook_events_processed";
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_webhook_events_eventType";
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_webhook_events_provider_eventId";
    `);

    // Drop webhook_events table
    await queryRunner.query(`DROP TABLE IF EXISTS "webhook_events";`);
  }
}
