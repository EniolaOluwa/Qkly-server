import { MigrationInterface, QueryRunner } from "typeorm";

export class FixCoordinateOnly1755200000001 implements MigrationInterface {
    name = 'FixCoordinateOnly1755200000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        try {
            await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "longitude" TYPE double precision`);
            await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "latitude" TYPE double precision`);
        } catch (error) {
            console.log('Error updating coordinate columns:', error.message);
            // Continue even if there's an error
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "longitude" TYPE numeric(11,8)`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "latitude" TYPE numeric(10,8)`);
    }
}
