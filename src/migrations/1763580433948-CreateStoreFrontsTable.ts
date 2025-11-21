import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateStoreFrontsTable1763580433948 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create store-fronts table
        await queryRunner.query(`
CREATE TABLE IF NOT EXISTS "store-fronts" (
    "id" SERIAL PRIMARY KEY,
    "businessId" integer NOT NULL UNIQUE,
    "coverImage" character varying NOT NULL,
    "storeName" character varying NOT NULL,
    "heroText" character varying NOT NULL,
    "storeColor" character varying NOT NULL,
    "categoryName" text[],
    "categoryImage" text[],
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);
`);

        // Add foreign key constraint
        await queryRunner.query(`
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'FK_store_fronts_businessId'
    ) THEN
        ALTER TABLE "store-fronts" ADD CONSTRAINT "FK_store_fronts_businessId" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE;
    END IF;
END $$;
`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraint
        await queryRunner.query(`ALTER TABLE "store-fronts" DROP CONSTRAINT IF EXISTS "FK_store_fronts_businessId"`);
        
        // Drop table
        await queryRunner.query(`DROP TABLE IF EXISTS "store-fronts"`);
    }

}
