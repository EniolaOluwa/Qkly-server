import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeProductDescriptionNullable1764337253620 implements MigrationInterface {
    name = 'MakeProductDescriptionNullable1764337253620'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "products" ALTER COLUMN "description" DROP NOT NULL`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "products" ALTER COLUMN "description" SET NOT NULL`
        );
    }
}
