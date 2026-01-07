import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEmailUnsubscriptions1767715934512 implements MigrationInterface {
    name = 'AddEmailUnsubscriptions1767715934512'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."email_unsubscriptions_category_enum" AS ENUM('marketing', 'transactional', 'all')`);
        await queryRunner.query(`CREATE TABLE "email_unsubscriptions" ("id" SERIAL NOT NULL, "email" character varying NOT NULL, "category" "public"."email_unsubscriptions_category_enum" NOT NULL DEFAULT 'marketing', "businessId" integer, "unsubscribeToken" character varying NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8ff3f29bf70dc2161cc37539197" UNIQUE ("unsubscribeToken"), CONSTRAINT "PK_4b1281ac45c64b180aa1365eb73" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_unsubscription_email_category_business" ON "email_unsubscriptions" ("email", "category", "businessId") `);
        await queryRunner.query(`CREATE INDEX "IDX_unsubscription_token" ON "email_unsubscriptions" ("unsubscribeToken") `);
        await queryRunner.query(`CREATE INDEX "IDX_unsubscription_email" ON "email_unsubscriptions" ("email") `);
        // Check if customerEmail column exists before adding (handles partial migration state)
        const hasCustomerEmail = await queryRunner.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'carts' AND column_name = 'customerEmail'
        `);
        if (hasCustomerEmail.length === 0) {
            await queryRunner.query(`ALTER TABLE "carts" ADD "customerEmail" character varying(255)`);
        }
        await queryRunner.query(`ALTER TABLE "email_unsubscriptions" ADD CONSTRAINT "FK_c9c8af57c3342d0589735d52b04" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "email_unsubscriptions" DROP CONSTRAINT "FK_c9c8af57c3342d0589735d52b04"`);
        await queryRunner.query(`ALTER TABLE "carts" DROP COLUMN "customerEmail"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_unsubscription_email"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_unsubscription_token"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_unsubscription_email_category_business"`);
        await queryRunner.query(`DROP TABLE "email_unsubscriptions"`);
        await queryRunner.query(`DROP TYPE "public"."email_unsubscriptions_category_enum"`);
    }

}
