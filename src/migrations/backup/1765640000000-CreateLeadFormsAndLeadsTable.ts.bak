import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateLeadFormsAndLeadsTable1765640000000 implements MigrationInterface {
    name = 'CreateLeadFormsAndLeadsTable1765640000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create lead-forms table
        await queryRunner.query(`
            CREATE TABLE "lead-forms" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "title" character varying NOT NULL,
                "description" text,
                "button_text" character varying NOT NULL,
                "inputs" jsonb,
                "logoUrl" character varying,
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_lead_forms_id" PRIMARY KEY ("id")
            )
        `);

        // Create leads table
        await queryRunner.query(`
            CREATE TABLE "leads" (
                "id" SERIAL NOT NULL,
                "name" character varying,
                "email" character varying NOT NULL,
                "phone" character varying,
                "formId" uuid NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_leads_id" PRIMARY KEY ("id")
            )
        `);

        // Add foreign key constraint
        await queryRunner.query(`
            ALTER TABLE "leads" 
            ADD CONSTRAINT "FK_leads_formId" 
            FOREIGN KEY ("formId") 
            REFERENCES "lead-forms"("id") 
            ON DELETE CASCADE 
            ON UPDATE NO ACTION
        `);

        // Create index on formId for better query performance
        await queryRunner.query(`
            CREATE INDEX "IDX_leads_formId" ON "leads" ("formId")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop index
        await queryRunner.query(`DROP INDEX "IDX_leads_formId"`);

        // Drop foreign key constraint
        await queryRunner.query(`
            ALTER TABLE "leads" 
            DROP CONSTRAINT "FK_leads_formId"
        `);

        // Drop tables
        await queryRunner.query(`DROP TABLE "leads"`);
        await queryRunner.query(`DROP TABLE "lead-forms"`);
    }

}
