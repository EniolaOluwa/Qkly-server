import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPinCreationToPurposeEnum1754655894439 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add the new 'pin_creation' value to the existing otps_purpose_enum
        await queryRunner.query(`ALTER TYPE "public"."otps_purpose_enum" ADD VALUE 'pin_creation'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Note: PostgreSQL doesn't support removing enum values directly
        // In a real scenario, you would need to recreate the enum and update all references
        // For now, we'll leave this empty as removing enum values is complex
    }

}
