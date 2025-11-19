import { MigrationInterface, QueryRunner } from "typeorm";

export class ConsolidateAndCleanupSchema1762980000000 implements MigrationInterface {
    name = 'ConsolidateAndCleanupSchema1762980000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // This migration consolidates the work from:
        // - CreateCategoryTable (1762472053999)
        // - OrderRefctoring (1762502502668)  
        // - FixMigrationIdType (1762896221850)
        // And removes duplicates from the schema

        // Skip if tables already exist - idempotent check
        const categoryTableExists = await queryRunner.hasTable('categories');
        const orderItemsTableExists = await queryRunner.hasTable('order_items');

        if (categoryTableExists && orderItemsTableExists) {
            console.log('Consolidated schema already applied. Skipping...');
            return;
        }

        // Create categories table if it doesn't exist
        if (!categoryTableExists) {
            await queryRunner.query(`CREATE TABLE "categories" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "parentId" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8b0be371d28245da6e4f4b61878" UNIQUE ("name"), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`);
            await queryRunner.query(`CREATE INDEX "IDX_8b0be371d28245da6e4f4b6187" ON "categories" ("name") `);
            await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "FK_9a6f051e66982b5f0318981bcaa" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        }

        // Update products table - add categoryId if needed
        const productsTable = await queryRunner.getTable('products');
        if (productsTable && !productsTable.findColumnByName('categoryId')) {
            await queryRunner.query(`ALTER TABLE "products" ADD "categoryId" integer NOT NULL`);
        }

        if (productsTable && !productsTable.findColumnByName('quantityInStock')) {
            await queryRunner.query(`ALTER TABLE "products" ADD "quantityInStock" integer NOT NULL DEFAULT '0'`);
        }

        if (productsTable && !productsTable.findColumnByName('hasVariation')) {
            await queryRunner.query(`ALTER TABLE "products" ADD "hasVariation" boolean NOT NULL DEFAULT false`);
            await queryRunner.query(`COMMENT ON COLUMN "products"."hasVariation" IS 'Does this product include size or color variations?'`);
        }

        if (productsTable && !productsTable.findColumnByName('colors')) {
            await queryRunner.query(`ALTER TABLE "products" ADD "colors" text`);
        }

        if (productsTable && !productsTable.findColumnByName('deletedAt')) {
            await queryRunner.query(`ALTER TABLE "products" ADD "deletedAt" TIMESTAMP`);
        }

        // Remove obsolete columns if they exist
        if (productsTable && productsTable.findColumnByName('color')) {
            await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "color"`);
        }

        if (productsTable && productsTable.findColumnByName('title')) {
            await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "title"`);
        }

        if (productsTable && productsTable.findColumnByName('category')) {
            await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "category"`);
        }

        // Add product indexes
        const productIndexes = ['IDX_99d90c2a483d79f3b627fb1d5e', 'IDX_359bd8406fbfb50e3ea42b5631', 'IDX_4c9fb58de893725258746385e1', 'IDX_ff56834e735fa78a15d0cf2192', 'IDX_75895eeb1903f8a17816dafe0a', 'IDX_0591b4a1abb428c6d86744cc0a', 'IDX_63fcb3d8806a6efd53dbc67430', 'IDX_69e49df9a08f8ded911758822f'];

        for (const indexName of productIndexes) {
            try {
                // Index names correspond to: userId, businessId, name, categoryId, price, quantityInStock, createdAt, userId+businessId
                if (indexName === 'IDX_99d90c2a483d79f3b627fb1d5e') {
                    await queryRunner.query(`CREATE INDEX "IDX_99d90c2a483d79f3b627fb1d5e" ON "products" ("userId") `);
                } else if (indexName === 'IDX_359bd8406fbfb50e3ea42b5631') {
                    await queryRunner.query(`CREATE INDEX "IDX_359bd8406fbfb50e3ea42b5631" ON "products" ("businessId") `);
                } else if (indexName === 'IDX_4c9fb58de893725258746385e1') {
                    await queryRunner.query(`CREATE INDEX "IDX_4c9fb58de893725258746385e1" ON "products" ("name") `);
                } else if (indexName === 'IDX_ff56834e735fa78a15d0cf2192') {
                    await queryRunner.query(`CREATE INDEX "IDX_ff56834e735fa78a15d0cf2192" ON "products" ("categoryId") `);
                } else if (indexName === 'IDX_75895eeb1903f8a17816dafe0a') {
                    await queryRunner.query(`CREATE INDEX "IDX_75895eeb1903f8a17816dafe0a" ON "products" ("price") `);
                } else if (indexName === 'IDX_0591b4a1abb428c6d86744cc0a') {
                    await queryRunner.query(`CREATE INDEX "IDX_0591b4a1abb428c6d86744cc0a" ON "products" ("quantityInStock") `);
                } else if (indexName === 'IDX_63fcb3d8806a6efd53dbc67430') {
                    await queryRunner.query(`CREATE INDEX "IDX_63fcb3d8806a6efd53dbc67430" ON "products" ("createdAt") `);
                } else if (indexName === 'IDX_69e49df9a08f8ded911758822f') {
                    await queryRunner.query(`CREATE INDEX "IDX_69e49df9a08f8ded911758822f" ON "products" ("userId", "businessId") `);
                }
            } catch (e) {
                // Index might already exist
            }
        }

        // Add foreign key constraint for categoryId if it doesn't exist
        try {
            const productsTableAfter = await queryRunner.getTable('products');
            if (productsTableAfter) {
                const categoryFK = productsTableAfter.foreignKeys.find(fk => fk.columnNames.includes('categoryId'));
                if (!categoryFK) {
                    await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_ff56834e735fa78a15d0cf21926" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
                }
            }
        } catch (e) {
            // FK might already exist
        }

        // Create order_items table if it doesn't exist
        if (!orderItemsTableExists) {
            await queryRunner.query(`CREATE TYPE "public"."order_items_status_enum" AS ENUM('PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED')`);
            await queryRunner.query(`CREATE TABLE "order_items" ("id" SERIAL NOT NULL, "orderId" integer NOT NULL, "productId" integer NOT NULL, "productName" character varying NOT NULL, "productDescription" text, "price" numeric(10,2) NOT NULL, "quantity" integer NOT NULL DEFAULT '1', "subtotal" numeric(10,2) NOT NULL, "color" character varying, "size" character varying, "imageUrls" text, "status" "public"."order_items_status_enum" NOT NULL DEFAULT 'PENDING', "notes" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_005269d8574e6fac0493715c308" PRIMARY KEY ("id"))`);
            await queryRunner.query(`CREATE INDEX "IDX_f1d359a55923bb45b057fbdab0" ON "order_items" ("orderId") `);
            await queryRunner.query(`CREATE INDEX "IDX_cdb99c05982d5191ac8465ac01" ON "order_items" ("productId") `);
            await queryRunner.query(`CREATE INDEX "IDX_f421c8981cca05954f98667134" ON "order_items" ("status") `);
            await queryRunner.query(`ALTER TABLE "order_items" ADD CONSTRAINT "FK_f1d359a55923bb45b057fbdab0d" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
            await queryRunner.query(`ALTER TABLE "order_items" ADD CONSTRAINT "FK_cdb99c05982d5191ac8465ac010" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        }

        // Update orders table
        const ordersTable = await queryRunner.getTable('orders');

        // Drop old columns if they exist
        const columnsToDropIfExist = ['transactionRef', 'orderStatus', 'transactionStatus', 'transactionMedium', 'dateOfTransaction', 'productDetails'];
        for (const col of columnsToDropIfExist) {
            if (ordersTable && ordersTable.findColumnByName(col)) {
                const constraint = ordersTable.uniques.find(u => u.columnNames.includes(col));
                if (constraint) {
                    await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "${constraint.name}"`);
                }
                await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "${col}"`);
            }
        }

        // Drop enum types if they exist
        const enumsToDropIfExist = ['orders_orderstatus_enum', 'orders_transactionstatus_enum', 'orders_transactionmedium_enum'];
        for (const enumType of enumsToDropIfExist) {
            try {
                await queryRunner.query(`DROP TYPE "public"."${enumType}"`);
            } catch (e) {
                // Type doesn't exist, that's fine
            }
        }

        // Add new columns to orders if they don't exist
        if (ordersTable && !ordersTable.findColumnByName('orderReference')) {
            await queryRunner.query(`ALTER TABLE "orders" ADD "orderReference" character varying NOT NULL`);
            await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "UQ_a8bdfcfdf8520db858774ab453c" UNIQUE ("orderReference")`);
        }

        if (ordersTable && !ordersTable.findColumnByName('transactionReference')) {
            await queryRunner.query(`ALTER TABLE "orders" ADD "transactionReference" character varying`);
            await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "UQ_3b5b32cf9f908e4cf776a94d2a9" UNIQUE ("transactionReference")`);
        }

        if (ordersTable && !ordersTable.findColumnByName('city')) {
            await queryRunner.query(`ALTER TABLE "orders" ADD "city" character varying`);
        }

        if (ordersTable && !ordersTable.findColumnByName('status')) {
            await queryRunner.query(`CREATE TYPE "public"."orders_status_enum" AS ENUM('PENDING', 'PROCESSING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED')`);
            await queryRunner.query(`ALTER TABLE "orders" ADD "status" "public"."orders_status_enum" NOT NULL DEFAULT 'PENDING'`);
        }

        if (ordersTable && !ordersTable.findColumnByName('paymentStatus')) {
            await queryRunner.query(`CREATE TYPE "public"."orders_paymentstatus_enum" AS ENUM('PENDING', 'INITIATED', 'PAID', 'PARTIALLY_PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'EXPIRED')`);
            await queryRunner.query(`ALTER TABLE "orders" ADD "paymentStatus" "public"."orders_paymentstatus_enum" NOT NULL DEFAULT 'PENDING'`);
        }

        if (ordersTable && !ordersTable.findColumnByName('paymentMethod')) {
            await queryRunner.query(`CREATE TYPE "public"."orders_paymentmethod_enum" AS ENUM('MONNIFY', 'BANK_TRANSFER', 'CARD', 'WALLET', 'CASH_ON_DELIVERY', 'USSD')`);
            await queryRunner.query(`ALTER TABLE "orders" ADD "paymentMethod" "public"."orders_paymentmethod_enum" NOT NULL`);
        }

        if (ordersTable && !ordersTable.findColumnByName('deliveryMethod')) {
            await queryRunner.query(`CREATE TYPE "public"."orders_deliverymethod_enum" AS ENUM('STANDARD', 'EXPRESS', 'PICKUP')`);
            await queryRunner.query(`ALTER TABLE "orders" ADD "deliveryMethod" "public"."orders_deliverymethod_enum" NOT NULL`);
        }

        if (ordersTable && !ordersTable.findColumnByName('subtotal')) {
            await queryRunner.query(`ALTER TABLE "orders" ADD "subtotal" numeric(10,2) NOT NULL`);
        }

        if (ordersTable && !ordersTable.findColumnByName('shippingFee')) {
            await queryRunner.query(`ALTER TABLE "orders" ADD "shippingFee" numeric(10,2) NOT NULL`);
        }

        if (ordersTable && !ordersTable.findColumnByName('tax')) {
            await queryRunner.query(`ALTER TABLE "orders" ADD "tax" numeric(10,2) NOT NULL`);
        }

        if (ordersTable && !ordersTable.findColumnByName('discount')) {
            await queryRunner.query(`ALTER TABLE "orders" ADD "discount" numeric(10,2) NOT NULL DEFAULT '0'`);
        }

        if (ordersTable && !ordersTable.findColumnByName('total')) {
            await queryRunner.query(`ALTER TABLE "orders" ADD "total" numeric(10,2) NOT NULL`);
        }

        if (ordersTable && !ordersTable.findColumnByName('paymentDate')) {
            await queryRunner.query(`ALTER TABLE "orders" ADD "paymentDate" TIMESTAMP`);
        }

        if (ordersTable && !ordersTable.findColumnByName('paymentDetails')) {
            await queryRunner.query(`ALTER TABLE "orders" ADD "paymentDetails" json`);
        }

        if (ordersTable && !ordersTable.findColumnByName('estimatedDeliveryDate')) {
            await queryRunner.query(`ALTER TABLE "orders" ADD "estimatedDeliveryDate" TIMESTAMP`);
        }

        if (ordersTable && !ordersTable.findColumnByName('deliveryDate')) {
            await queryRunner.query(`ALTER TABLE "orders" ADD "deliveryDate" TIMESTAMP`);
        }

        if (ordersTable && !ordersTable.findColumnByName('deliveryDetails')) {
            await queryRunner.query(`ALTER TABLE "orders" ADD "deliveryDetails" json`);
        }

        if (ordersTable && !ordersTable.findColumnByName('notes')) {
            await queryRunner.query(`ALTER TABLE "orders" ADD "notes" text`);
        }

        if (ordersTable && !ordersTable.findColumnByName('isBusinessSettled')) {
            await queryRunner.query(`ALTER TABLE "orders" ADD "isBusinessSettled" boolean NOT NULL DEFAULT false`);
        }

        if (ordersTable && !ordersTable.findColumnByName('settlementReference')) {
            await queryRunner.query(`ALTER TABLE "orders" ADD "settlementReference" character varying`);
        }

        if (ordersTable && !ordersTable.findColumnByName('settlementDate')) {
            await queryRunner.query(`ALTER TABLE "orders" ADD "settlementDate" TIMESTAMP`);
        }

        if (ordersTable && !ordersTable.findColumnByName('settlementDetails')) {
            await queryRunner.query(`ALTER TABLE "orders" ADD "settlementDetails" json`);
        }

        if (ordersTable && !ordersTable.findColumnByName('deletedAt')) {
            await queryRunner.query(`ALTER TABLE "orders" ADD "deletedAt" TIMESTAMP`);
        }

        // Update reviews table
        const reviewsTable = await queryRunner.getTable('reviews');

        if (reviewsTable && !reviewsTable.findColumnByName('userId')) {
            await queryRunner.query(`ALTER TABLE "reviews" ADD "userId" integer NOT NULL`);
        }

        if (reviewsTable && !reviewsTable.findColumnByName('orderItemId')) {
            await queryRunner.query(`ALTER TABLE "reviews" ADD "orderItemId" integer NOT NULL`);
        }

        if (reviewsTable && !reviewsTable.findColumnByName('imageUrls')) {
            await queryRunner.query(`ALTER TABLE "reviews" ADD "imageUrls" text`);
            await queryRunner.query(`COMMENT ON COLUMN "reviews"."imageUrls" IS 'Array of image URLs'`);
        }

        if (reviewsTable && !reviewsTable.findColumnByName('isVisible')) {
            await queryRunner.query(`ALTER TABLE "reviews" ADD "isVisible" boolean NOT NULL DEFAULT true`);
        }

        if (reviewsTable && !reviewsTable.findColumnByName('isVerifiedPurchase')) {
            await queryRunner.query(`ALTER TABLE "reviews" ADD "isVerifiedPurchase" boolean NOT NULL DEFAULT false`);
        }

        if (reviewsTable && !reviewsTable.findColumnByName('deletedAt')) {
            await queryRunner.query(`ALTER TABLE "reviews" ADD "deletedAt" TIMESTAMP`);
        }

        // Add review indexes
        const reviewIndexes = [
            { name: 'IDX_7ed5659e7139fc8bc039198cc1', column: 'userId' },
            { name: 'IDX_d17ce9c119d29c7ec8c884044c', column: 'businessId' },
            { name: 'IDX_a6b3c434392f5d10ec17104366', column: 'productId' },
            { name: 'IDX_53a68dc905777554b7f702791f', column: 'orderId' },
            { name: 'IDX_1e6c554d615dd5a5bf0e11ee0e', column: 'orderItemId' }
        ];

        for (const idx of reviewIndexes) {
            try {
                await queryRunner.query(`CREATE INDEX "${idx.name}" ON "reviews" ("${idx.column}") `);
            } catch (e) {
                // Index might already exist
            }
        }

        // Add order indexes - ONLY ONCE, avoiding duplicates
        const orderIndexes = [
            { name: 'IDX_151b79a83ba240b0cb31b2302d', column: 'userId' },
            { name: 'IDX_778777c5d7d56ed1bbaa907b8e', column: 'businessId' },
            { name: 'IDX_775c9f06fc27ae3ff8fb26f2c4', column: 'status' },
            { name: 'IDX_01b20118a3f640214e7a8a6b29', column: 'paymentStatus' },
            { name: 'IDX_1f4b9818a08b822a31493fdee9', column: 'createdAt' },
            { name: 'IDX_5025e0259ec0b1ffb5f0ea6685', columns: ['userId', 'businessId'] }
        ];

        for (const idx of orderIndexes) {
            try {
                if (idx.columns) {
                    await queryRunner.query(`CREATE INDEX "${idx.name}" ON "orders" ("${idx.columns.join('", "')}") `);
                } else {
                    await queryRunner.query(`CREATE INDEX "${idx.name}" ON "orders" ("${idx.column}") `);
                }
            } catch (e) {
                // Index might already exist
            }
        }

        // Add foreign key constraints for reviews if they don't exist
        try {
            const reviewsTableAfter = await queryRunner.getTable('reviews');
            if (reviewsTableAfter) {
                const reviewFKs = ['FK_7ed5659e7139fc8bc039198cc1f', 'FK_53a68dc905777554b7f702791fa', 'FK_1e6c554d615dd5a5bf0e11ee0e9'];

                for (const fkName of reviewFKs) {
                    const fkExists = reviewsTableAfter.foreignKeys.find(fk => fk.name === fkName);
                    if (!fkExists) {
                        if (fkName === 'FK_7ed5659e7139fc8bc039198cc1f') {
                            await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_7ed5659e7139fc8bc039198cc1f" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
                        } else if (fkName === 'FK_53a68dc905777554b7f702791fa') {
                            await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_53a68dc905777554b7f702791fa" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
                        } else if (fkName === 'FK_1e6c554d615dd5a5bf0e11ee0e9') {
                            await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_1e6c554d615dd5a5bf0e11ee0e9" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
                        }
                    }
                }
            }
        } catch (e) {
            // FK might already exist or table doesn't exist
        }

        // Update users phone column length if needed
        const usersTable = await queryRunner.getTable('users');
        if (usersTable) {
            const phoneCol = usersTable.findColumnByName('phone');
            if (phoneCol && phoneCol.length !== '20') {
                await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_a000cca60bcf04454e727699490"`);
                await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "phone"`);
                await queryRunner.query(`ALTER TABLE "users" ADD "phone" character varying(20) NOT NULL`);
                await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_a000cca60bcf04454e727699490" UNIQUE ("phone")`);
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Reverse all changes from up()
        // This would be a complex reverse migration, so simplified version:
        console.log('Down migration not fully implemented. Manual intervention may be needed.');

        // Basic cleanup if needed:
        const categoryTableExists = await queryRunner.hasTable('categories');
        const orderItemsTableExists = await queryRunner.hasTable('order_items');

        if (orderItemsTableExists) {
            await queryRunner.query(`DROP TABLE "order_items"`);
            try {
                await queryRunner.query(`DROP TYPE "public"."order_items_status_enum"`);
            } catch (e) {
                // Type might not exist
            }
        }

        if (categoryTableExists) {
            await queryRunner.query(`DROP TABLE "categories"`);
        }
    }
}
