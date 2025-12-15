import { MigrationInterface, QueryRunner } from "typeorm";

export class BusinessLeads1765794978833 implements MigrationInterface {
    name = 'BusinessLeads1765794978833'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_19a7638af058ba9a727b100869" ON "orders" ("customerEmail") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_19a7638af058ba9a727b100869"`);
    }

}
