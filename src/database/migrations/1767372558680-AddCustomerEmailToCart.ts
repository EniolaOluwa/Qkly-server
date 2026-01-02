import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCustomerEmailToCart1767372558680 implements MigrationInterface {
    name = 'AddCustomerEmailToCart1767372558680'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "carts" ADD "customerEmail" character varying(255)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "carts" DROP COLUMN "customerEmail"`);
    }

}
