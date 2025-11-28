import { MigrationInterface, QueryRunner } from "typeorm";

export class UuidToNumberMigration1687654321000 implements MigrationInterface {
    name = 'UuidToNumberMigration1687654321000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1️⃣ Add new numeric ID columns
        await queryRunner.query(`ALTER TABLE "lead-forms" ADD COLUMN "id_new" SERIAL`);
        await queryRunner.query(`ALTER TABLE "leads" ADD COLUMN "id_new" SERIAL`);
        await queryRunner.query(`ALTER TABLE "leads" ADD COLUMN "formId_new" integer`);

        // 2️⃣ Map leads.formId to lead-forms.id_new
        await queryRunner.query(`
            UPDATE "leads" l
            SET "formId_new" = lf."id_new"
            FROM "lead-forms" lf
            WHERE l."formId" = lf."id"
        `);

        // 3️⃣ Drop old foreign key constraints
        await queryRunner.query(`ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "FK_daf8eb3d52d018ea43df6d5edab"`);

        // 4️⃣ Drop old primary keys
        await queryRunner.query(`ALTER TABLE "lead-forms" DROP CONSTRAINT IF EXISTS "PK_lead-forms_id"`);
        await queryRunner.query(`ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "PK_leads_id"`);

        // 5️⃣ Drop old UUID columns
        await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN "formId"`);
        await queryRunner.query(`ALTER TABLE "lead-forms" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN "id"`);

        // 6️⃣ Rename new columns to replace old IDs
        await queryRunner.query(`ALTER TABLE "lead-forms" RENAME COLUMN "id_new" TO "id"`);
        await queryRunner.query(`ALTER TABLE "leads" RENAME COLUMN "id_new" TO "id"`);
        await queryRunner.query(`ALTER TABLE "leads" RENAME COLUMN "formId_new" TO "formId"`);

        // 7️⃣ Recreate primary key constraints
        await queryRunner.query(`ALTER TABLE "lead-forms" ADD CONSTRAINT "PK_lead-forms_id" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "leads" ADD CONSTRAINT "PK_leads_id" PRIMARY KEY ("id")`);

        // 8️⃣ Recreate foreign key constraint
        await queryRunner.query(`
            ALTER TABLE "leads" 
            ADD CONSTRAINT "FK_leads_formId" 
            FOREIGN KEY ("formId") REFERENCES "lead-forms"("id") 
            ON DELETE CASCADE
        `);

        // ✅ Optional: re-add other foreign keys if needed
        // Example for businessId if your schema has it
        await queryRunner.query(`
            ALTER TABLE "lead-forms" 
            ADD CONSTRAINT "FK_leadforms_businessId" 
            FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "leads" 
            ADD CONSTRAINT "FK_leads_businessId" 
            FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // This is destructive to revert safely; in practice you cannot restore UUIDs.
        throw new Error("Down migration not supported for UUID → number conversion");
    }
}
