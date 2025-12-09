import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDevicesTable1763585000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create devices table
        await queryRunner.query(`
CREATE TABLE IF NOT EXISTS "devices" (
    "id" SERIAL PRIMARY KEY,
    "userId" integer NOT NULL,
    "businessId" integer,
    "deviceName" character varying,
    "osType" character varying,
    "osVersion" character varying,
    "deviceType" character varying,
    "referralUrl" character varying,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);
        `);

        // Add foreign key for userId
        await queryRunner.query(`
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE constraint_name = 'FK_devices_userId'
            ) THEN
                ALTER TABLE "devices"
                ADD CONSTRAINT "FK_devices_userId"
                FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
            END IF;
        END $$;
        `);

        // Add foreign key for businessId
        await queryRunner.query(`
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE constraint_name = 'FK_devices_businessId'
            ) THEN
                ALTER TABLE "devices"
                ADD CONSTRAINT "FK_devices_businessId"
                FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE SET NULL;
            END IF;
        END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraints
        await queryRunner.query(`
            ALTER TABLE "devices" DROP CONSTRAINT IF EXISTS "FK_devices_userId";
        `);

        await queryRunner.query(`
            ALTER TABLE "devices" DROP CONSTRAINT IF EXISTS "FK_devices_businessId";
        `);

        // Drop devices table
        await queryRunner.query(`
            DROP TABLE IF EXISTS "devices";
        `);
    }
}
