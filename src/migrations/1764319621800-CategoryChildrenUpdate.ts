import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveCategoryParentRelation1674319621800 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop the foreign key constraint on parentId
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "FK_9a6f051e66982b5f0318981bcaa"`);
        // Drop the parentId column
        await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "parentId"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Re-add the parentId column
        await queryRunner.query(`ALTER TABLE "categories" ADD "parentId" integer`);
        // Re-add the foreign key constraint
        await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "FK_9a6f051e66982b5f0318981bcaa" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }
}
