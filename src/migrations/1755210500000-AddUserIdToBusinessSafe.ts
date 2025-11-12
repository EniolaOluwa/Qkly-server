import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserIdToBusinessSafe1755210500000 implements MigrationInterface {
    name = "AddUserIdToBusinessSafe1755210500000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        try {
            console.log("Starting AddUserIdToBusinessSafe migration...");

            // Check if column already exists
            const table = await queryRunner.getTable("businesses");
            const hasUserId = table?.findColumnByName("userId");

            if (!hasUserId) {
                console.log('Adding userId column as nullable...');
                await queryRunner.query(`ALTER TABLE "businesses" ADD "userId" integer`);
            } else {
                console.log('Column "userId" already exists. Skipping...');
            }

            // Ensure uniqueness and FK constraints only if not present
            const uniqueExists = table?.uniques.some(u => u.columnNames.includes("userId"));
            if (!uniqueExists) {
                console.log('Adding unique constraint on userId...');
                await queryRunner.query(
                    `ALTER TABLE "businesses" ADD CONSTRAINT "UQ_businesses_userId" UNIQUE ("userId")`
                );
            } else {
                console.log('Unique constraint on userId already exists. Skipping...');
            }

            const fkExists = table?.foreignKeys.some(fk => fk.columnNames.includes("userId"));
            if (!fkExists) {
                console.log('Adding foreign key constraint for userId...');
                await queryRunner.query(
                    `ALTER TABLE "businesses" ADD CONSTRAINT "FK_businesses_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
                );
            } else {
                console.log('Foreign key constraint for userId already exists. Skipping...');
            }

            console.log("AddUserIdToBusinessSafe migration completed successfully!");
        } catch (error) {
            console.error("Error during migration:", error.message);
            throw error;
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        try {
            console.log("Rolling back AddUserIdToBusinessSafe migration...");

            const table = await queryRunner.getTable("businesses");

            // Drop FK if exists
            const fk = table?.foreignKeys.find(fk => fk.columnNames.includes("userId"));
            if (fk) {
                await queryRunner.query(`ALTER TABLE "businesses" DROP CONSTRAINT "${fk.name}"`);
            }

            // Drop unique constraint if exists
            const uq = table?.uniques.find(uq => uq.columnNames.includes("userId"));
            if (uq) {
                await queryRunner.query(`ALTER TABLE "businesses" DROP CONSTRAINT "${uq.name}"`);
            }

            // Drop the column if it exists
            const col = table?.findColumnByName("userId");
            if (col) {
                await queryRunner.query(`ALTER TABLE "businesses" DROP COLUMN "userId"`);
            }

            console.log("Rollback completed successfully!");
        } catch (error) {
            console.error("Error during rollback:", error.message);
            throw error;
        }
    }
}
