import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateProductSizesTable1763000000000 implements MigrationInterface {
    name = 'CreateProductSizesTable1763000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create enum type for measurement if not exists
        try {
            await queryRunner.query(`CREATE TYPE "public"."product_sizes_measurement_enum" AS ENUM('SIZE', 'LABEL')`);
        } catch (e) {
            // type might already exist
        }

        // Create table product_sizes if not exists
        const tableExists = await queryRunner.hasTable('product_sizes');
        if (!tableExists) {
            await queryRunner.query(`CREATE TABLE "product_sizes" ("id" SERIAL NOT NULL, "measurement" "public"."product_sizes_measurement_enum" NOT NULL, "value" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "productId" integer, CONSTRAINT "PK_19c3d021f81c5b1ff367bad6164" PRIMARY KEY ("id"))`);
            await queryRunner.query(`ALTER TABLE "product_sizes" ADD CONSTRAINT "FK_699f5366c2ebf46a77589bd225e" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const tableExists = await queryRunner.hasTable('product_sizes');
        if (tableExists) {
            await queryRunner.query(`ALTER TABLE "product_sizes" DROP CONSTRAINT "FK_699f5366c2ebf46a77589bd225e"`);
            await queryRunner.query(`DROP TABLE "product_sizes"`);
        }

        try {
            await queryRunner.query(`DROP TYPE "public"."product_sizes_measurement_enum"`);
        } catch (e) {
            // type might not exist
        }
    }
}
