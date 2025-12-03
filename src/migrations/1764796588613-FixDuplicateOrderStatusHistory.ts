import { MigrationInterface, QueryRunner } from "typeorm";

export class FixDuplicateOrderStatusHistory1764796588613 implements MigrationInterface {
    name = 'FixDuplicateOrderStatusHistory1764796588613'


    public async up(queryRunner: QueryRunner): Promise<void> {
        // Define interface for status history entry
        interface StatusHistoryEntry {
            status: string;
            timestamp: string | Date;
            updatedBy?: number | null;
            notes?: string;
            metadata?: Record<string, any>;
        }

        // Get all orders with status history
        const orders: Array<{ id: number; statusHistory: string }> = await queryRunner.query(`
      SELECT id, "statusHistory"::text as "statusHistory"
      FROM orders 
      WHERE "statusHistory" IS NOT NULL 
        AND "statusHistory"::text != '[]'
    `);

        console.log(`Found ${orders.length} orders to process`);

        for (const order of orders) {
            const statusHistory: StatusHistoryEntry[] = JSON.parse(order.statusHistory);

            if (!Array.isArray(statusHistory) || statusHistory.length === 0) {
                continue;
            }

            // Remove duplicates while preserving the earliest occurrence of each status
            const uniqueStatuses = new Map<string, boolean>();
            const cleanedHistory: StatusHistoryEntry[] = [];

            for (const entry of statusHistory) {
                const status = entry.status;

                if (!uniqueStatuses.has(status)) {
                    uniqueStatuses.set(status, true);
                    cleanedHistory.push(entry);
                } else {
                    console.log(`Removing duplicate status ${status} from order ${order.id}`);
                }
            }

            // Sort by timestamp to maintain chronological order
            cleanedHistory.sort((a: StatusHistoryEntry, b: StatusHistoryEntry) => {
                const dateA = new Date(a.timestamp);
                const dateB = new Date(b.timestamp);
                return dateA.getTime() - dateB.getTime();
            });

            // Update the order with cleaned history
            await queryRunner.query(
                `UPDATE orders SET "statusHistory" = $1 WHERE id = $2`,
                [JSON.stringify(cleanedHistory), order.id]
            );

            console.log(
                `Order ${order.id}: Cleaned from ${statusHistory.length} to ${cleanedHistory.length} entries`
            );
        }

        console.log('Migration completed successfully');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // No down migration - we don't want to restore duplicates
        console.log('Down migration skipped - duplicate removal is permanent');
    }
}
