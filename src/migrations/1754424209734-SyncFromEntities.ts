import { MigrationInterface, QueryRunner } from "typeorm";

export class SyncFromEntities1754424209734 implements MigrationInterface {
    name = 'SyncFromEntities1754424209734'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."orders_orderstatus_enum" AS ENUM('ordered', 'dispatched', 'delivered', 'returned')`);
        await queryRunner.query(`CREATE TYPE "public"."orders_transactionstatus_enum" AS ENUM('pending', 'successful', 'failed', 'cancelled')`);
        await queryRunner.query(`CREATE TYPE "public"."orders_transactionmedium_enum" AS ENUM('web', 'mobile')`);
        await queryRunner.query(`CREATE TABLE "orders" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "businessId" integer NOT NULL, "transactionRef" character varying NOT NULL, "customerName" character varying NOT NULL, "deliveryAddress" text NOT NULL, "state" character varying NOT NULL, "customerEmail" character varying NOT NULL, "customerPhoneNumber" character varying NOT NULL, "orderStatus" "public"."orders_orderstatus_enum" NOT NULL DEFAULT 'ordered', "transactionStatus" "public"."orders_transactionstatus_enum" NOT NULL DEFAULT 'pending', "transactionMedium" "public"."orders_transactionmedium_enum" NOT NULL, "dateOfTransaction" TIMESTAMP NOT NULL DEFAULT now(), "productDetails" json NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_b44079e7599f6198a41c9dde63f" UNIQUE ("transactionRef"), CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id")); COMMENT ON COLUMN "orders"."productDetails" IS 'Array of product details including product ID, quantity, and colour'`);
        await queryRunner.query(`CREATE TABLE "products" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "businessId" integer NOT NULL, "images" text, "color" character varying, "title" character varying NOT NULL, "description" text, "price" numeric(10,2) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id")); COMMENT ON COLUMN "products"."images" IS 'Array of image URLs'; COMMENT ON COLUMN "products"."color" IS 'Hex color value'`);
        await queryRunner.query(`ALTER TYPE "public"."user_role_enum" RENAME TO "user_role_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('merchant', 'admin')`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum" USING "role"::"text"::"public"."users_role_enum"`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'merchant'`);
        await queryRunner.query(`DROP TYPE "public"."user_role_enum_old"`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_151b79a83ba240b0cb31b2302d1" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_778777c5d7d56ed1bbaa907b8e5" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_99d90c2a483d79f3b627fb1d5e9" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_359bd8406fbfb50e3ea42b5631f" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_359bd8406fbfb50e3ea42b5631f"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_99d90c2a483d79f3b627fb1d5e9"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_778777c5d7d56ed1bbaa907b8e5"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_151b79a83ba240b0cb31b2302d1"`);
        await queryRunner.query(`CREATE TYPE "public"."user_role_enum_old" AS ENUM('merchant', 'admin')`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."user_role_enum_old" USING "role"::"text"::"public"."user_role_enum_old"`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'merchant'`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."user_role_enum_old" RENAME TO "user_role_enum"`);
        await queryRunner.query(`DROP TABLE "products"`);
        await queryRunner.query(`DROP TABLE "orders"`);
        await queryRunner.query(`DROP TYPE "public"."orders_transactionmedium_enum"`);
        await queryRunner.query(`DROP TYPE "public"."orders_transactionstatus_enum"`);
        await queryRunner.query(`DROP TYPE "public"."orders_orderstatus_enum"`);
    }

}
