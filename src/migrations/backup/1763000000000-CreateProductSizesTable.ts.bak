import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateProductSizesTable1763000000000 implements MigrationInterface {
    name = 'CreateProductSizesTable1763000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {

        // Create ENUM safely
        await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 
                    FROM pg_type 
                    WHERE typname = 'product_sizes_measurement_enum'
                ) THEN
                    CREATE TYPE "product_sizes_measurement_enum" AS ENUM ('SIZE', 'LABEL');
                END IF;
            END $$;
        `);

        // Create table if it does not exist
        const tableExists = await queryRunner.hasTable('product_sizes');

        if (!tableExists) {
            await queryRunner.query(`
                CREATE TABLE "product_sizes" (
                    "id" SERIAL NOT NULL,
                    "measurement" "product_sizes_measurement_enum" NOT NULL,
                    "value" text NOT NULL,
                    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                    "productId" integer,
                    CONSTRAINT "PK_19c3d021f81c5b1ff367bad6164" PRIMARY KEY ("id")
                );
            `);

            await queryRunner.query(`
                ALTER TABLE "product_sizes" 
                ADD CONSTRAINT "FK_699f5366c2ebf46a77589bd225e" 
                FOREIGN KEY ("productId") REFERENCES "products"("id") 
                ON DELETE CASCADE ON UPDATE NO ACTION;
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const tableExists = await queryRunner.hasTable('product_sizes');

        if (tableExists) {
            await queryRunner.query(`ALTER TABLE "product_sizes" DROP CONSTRAINT "FK_699f5366c2ebf46a77589bd225e"`);
            await queryRunner.query(`DROP TABLE "product_sizes"`);
        }

        await queryRunner.query(`
            DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_sizes_measurement_enum') THEN
                    DROP TYPE "product_sizes_measurement_enum";
                END IF;
            END $$;
        `);
    }
}
