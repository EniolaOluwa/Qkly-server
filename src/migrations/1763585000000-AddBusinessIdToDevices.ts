import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBusinessIdToDevices1763585000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {

        // 1. Add businessId column if it does not already exist
        await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 
                    FROM information_schema.columns
                    WHERE table_name = 'devices'
                    AND column_name = 'businessId'
                ) THEN
                    ALTER TABLE "devices"
                    ADD COLUMN "businessId" integer;
                END IF;
            END $$;
        `);

        // 2. Add foreign key (if not already created)
        await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.table_constraints
                    WHERE constraint_name = 'FK_devices_businessId'
                ) THEN
                    ALTER TABLE "devices"
                    ADD CONSTRAINT "FK_devices_businessId"
                    FOREIGN KEY ("businessId")
                    REFERENCES "businesses"("id")
                    ON DELETE SET NULL;
                END IF;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {

        // Remove foreign key
        await queryRunner.query(`
            ALTER TABLE "devices"
            DROP CONSTRAINT IF EXISTS "FK_devices_businessId";
        `);

        // Remove businessId column
        await queryRunner.query(`
            ALTER TABLE "devices"
            DROP COLUMN IF EXISTS "businessId";
        `);
    }
}
