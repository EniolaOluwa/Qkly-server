import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserIdToBusinessSafe1755210500000 implements MigrationInterface {
    name = 'AddUserIdToBusinessSafe1755210500000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        try {
            // Step 1: Add userId column as nullable first
            console.log('Adding userId column as nullable...');
            await queryRunner.query(`ALTER TABLE "businesses" ADD "userId" integer`);
            
            // Step 2: Check if there are any existing businesses without users
            const existingBusinesses = await queryRunner.query(
                `SELECT b.id as business_id, u.id as user_id 
                 FROM "businesses" b 
                 LEFT JOIN "users" u ON u."businessId" = b.id`
            );
            
            console.log(`Found ${existingBusinesses.length} existing businesses`);
            
            // Step 3: Handle existing businesses
            for (const business of existingBusinesses) {
                if (business.user_id) {
                    // Business has an associated user, link them
                    console.log(`Linking business ${business.business_id} to user ${business.user_id}`);
                    await queryRunner.query(
                        `UPDATE "businesses" SET "userId" = $1 WHERE id = $2`,
                        [business.user_id, business.business_id]
                    );
                } else {
                    // Business has no associated user, we need to delete it or handle it
                    console.log(`Deleting orphaned business ${business.business_id} (no associated user)`);
                    await queryRunner.query(`DELETE FROM "businesses" WHERE id = $1`, [business.business_id]);
                }
            }
            
            // Step 4: Now make userId NOT NULL since all remaining businesses have users
            console.log('Making userId NOT NULL...');
            await queryRunner.query(`ALTER TABLE "businesses" ALTER COLUMN "userId" SET NOT NULL`);
            
            // Step 5: Add unique constraint on userId (one business per user)
            console.log('Adding unique constraint on userId...');
            await queryRunner.query(`ALTER TABLE "businesses" ADD CONSTRAINT "UQ_businesses_userId" UNIQUE ("userId")`);
            
            // Step 6: Add foreign key constraint
            console.log('Adding foreign key constraint...');
            await queryRunner.query(`ALTER TABLE "businesses" ADD CONSTRAINT "FK_businesses_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
            
            // Step 7: Update users table to make businessId unique (one-to-one relationship)
            console.log('Adding unique constraint on users.businessId...');
            
            // First drop the existing foreign key constraint if it exists
            try {
                await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_78725ac7117e7526e028014606b"`);
            } catch (error) {
                console.log('Foreign key constraint may not exist, continuing...');
            }
            
            // Add unique constraint on businessId
            await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_users_businessId" UNIQUE ("businessId")`);
            
            // Re-add the foreign key constraint
            await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_users_businessId" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
            
            console.log('Migration completed successfully!');
            
        } catch (error) {
            console.error('Error during migration:', error.message);
            throw error;
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        try {
            console.log('Rolling back migration...');
            
            // Remove constraints and column in reverse order
            await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_users_businessId"`);
            await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_users_businessId"`);
            await queryRunner.query(`ALTER TABLE "businesses" DROP CONSTRAINT "FK_businesses_userId"`);
            await queryRunner.query(`ALTER TABLE "businesses" DROP CONSTRAINT "UQ_businesses_userId"`);
            await queryRunner.query(`ALTER TABLE "businesses" DROP COLUMN "userId"`);
            
            // Restore original foreign key if needed
            try {
                await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_78725ac7117e7526e028014606b" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
            } catch (error) {
                console.log('Could not restore original FK constraint, may not have existed');
            }
            
            console.log('Rollback completed successfully!');
            
        } catch (error) {
            console.error('Error during rollback:', error.message);
            throw error;
        }
    }
}
