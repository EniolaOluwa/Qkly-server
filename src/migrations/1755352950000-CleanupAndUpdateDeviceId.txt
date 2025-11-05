import { MigrationInterface, QueryRunner } from "typeorm";

export class CleanupAndUpdateDeviceId1755352950000 implements MigrationInterface {
    name = 'CleanupAndUpdateDeviceId1755352950000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // First, let's handle duplicate phone numbers by keeping only the most recent entry
        // and deleting older duplicates
        await queryRunner.query(`
            DELETE FROM users u1 
            WHERE u1.id NOT IN (
                SELECT MAX(u2.id) 
                FROM users u2 
                GROUP BY u2.phone
            )
        `);

        // Ensure all users have a deviceId (set a default value for any null deviceId)
        await queryRunner.query(`
            UPDATE users 
            SET "deviceId" = CONCAT('migrated_device_', id::text) 
            WHERE "deviceId" IS NULL
        `);

        // Now we can safely make deviceId NOT NULL
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "deviceId" SET NOT NULL`);
        
        // Add unique constraint to phone if it doesn't exist
        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'UQ_users_phone' 
                    AND table_name = 'users'
                ) THEN
                    ALTER TABLE "users" ADD CONSTRAINT "UQ_users_phone" UNIQUE ("phone");
                END IF;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert deviceId to nullable
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "deviceId" DROP NOT NULL`);
        
        // Remove unique constraint on phone
        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'UQ_users_phone' 
                    AND table_name = 'users'
                ) THEN
                    ALTER TABLE "users" DROP CONSTRAINT "UQ_users_phone";
                END IF;
            END $$;
        `);
    }
}
