import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCategoryTable1762472053999 implements MigrationInterface {
    name = 'CreateCategoryTable1762472053999'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "categories" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "parentId" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8b0be371d28245da6e4f4b61878" UNIQUE ("name"), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8b0be371d28245da6e4f4b6187" ON "categories" ("name") `);
        await queryRunner.query(`CREATE TYPE "public"."product_sizes_measurement_enum" AS ENUM('SIZE', 'LABEL')`);
        await queryRunner.query(`CREATE TABLE "product_sizes" ("id" SERIAL NOT NULL, "measurement" "public"."product_sizes_measurement_enum" NOT NULL, "value" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "productId" integer, CONSTRAINT "PK_19c3d021f81c5b1ff367bad6164" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "color"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "title"`);
        await queryRunner.query(`ALTER TABLE "products" ADD "categoryId" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "products" ADD "quantityInStock" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "products" ADD "hasVariation" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`COMMENT ON COLUMN "products"."hasVariation" IS 'Does this product include size or color variations?'`);
        await queryRunner.query(`ALTER TABLE "products" ADD "colors" text`);
        await queryRunner.query(`ALTER TABLE "products" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`CREATE INDEX "IDX_99d90c2a483d79f3b627fb1d5e" ON "products" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_359bd8406fbfb50e3ea42b5631" ON "products" ("businessId") `);
        await queryRunner.query(`CREATE INDEX "IDX_4c9fb58de893725258746385e1" ON "products" ("name") `);
        await queryRunner.query(`CREATE INDEX "IDX_ff56834e735fa78a15d0cf2192" ON "products" ("categoryId") `);
        await queryRunner.query(`CREATE INDEX "IDX_75895eeb1903f8a17816dafe0a" ON "products" ("price") `);
        await queryRunner.query(`CREATE INDEX "IDX_0591b4a1abb428c6d86744cc0a" ON "products" ("quantityInStock") `);
        await queryRunner.query(`CREATE INDEX "IDX_63fcb3d8806a6efd53dbc67430" ON "products" ("createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_69e49df9a08f8ded911758822f" ON "products" ("userId", "businessId") `);
        await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "FK_9a6f051e66982b5f0318981bcaa" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_ff56834e735fa78a15d0cf21926" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "product_sizes" ADD CONSTRAINT "FK_699f5366c2ebf46a77589bd225e" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "product_sizes" DROP CONSTRAINT "FK_699f5366c2ebf46a77589bd225e"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_ff56834e735fa78a15d0cf21926"`);
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "FK_9a6f051e66982b5f0318981bcaa"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_69e49df9a08f8ded911758822f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_63fcb3d8806a6efd53dbc67430"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0591b4a1abb428c6d86744cc0a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_75895eeb1903f8a17816dafe0a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ff56834e735fa78a15d0cf2192"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4c9fb58de893725258746385e1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_359bd8406fbfb50e3ea42b5631"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_99d90c2a483d79f3b627fb1d5e"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "colors"`);
        await queryRunner.query(`COMMENT ON COLUMN "products"."hasVariation" IS 'Does this product include size or color variations?'`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "hasVariation"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "quantityInStock"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "categoryId"`);
        await queryRunner.query(`ALTER TABLE "products" ADD "title" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "products" ADD "color" character varying`);
        await queryRunner.query(`DROP TABLE "product_sizes"`);
        await queryRunner.query(`DROP TYPE "public"."product_sizes_measurement_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8b0be371d28245da6e4f4b6187"`);
        await queryRunner.query(`DROP TABLE "categories"`);
    }

}
