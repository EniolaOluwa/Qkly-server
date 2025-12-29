require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USERNAME || 'qkly-server',
  password: process.env.DB_PASSWORD || 'password@12345',
  database: process.env.DB_NAME || 'ecommerce',
});

const REF = process.argv[2]; 

async function run() {
  try {
    await client.connect();
    
    // 1. Find Order
    const orderRes = await client.query(`SELECT id, "businessId", "transactionReference" FROM orders WHERE "transactionReference" = $1`, [REF]);
    if (orderRes.rowCount === 0) { console.log('Order NOT FOUND'); return; }
    const order = orderRes.rows[0];
    console.log(`[PASS] Order Found: ${order.id}`);

    // 2. Find Transaction
    const txnRes = await client.query(`SELECT * FROM transactions WHERE "reference" LIKE 'STL-%' AND "description" LIKE $1`, [`%${order.orderReference}%`]); 
    // Wait, orderReference is not transactionReference. 
    // I need orderReference.
    const orderRefRes = await client.query(`SELECT "orderReference" FROM orders WHERE id = $1`, [order.id]);
    const orderRef = orderRefRes.rows[0].orderReference;
    
    // Check Settlement Table directly
    const stlRes = await client.query(`SELECT * FROM settlements WHERE "orderId" = $1`, [order.id]);
    if (stlRes.rowCount > 0) {
        console.log(`[PASS] Settlement Record Found: ${stlRes.rows[0].settlementReference}`);
        console.log(`       Status: ${stlRes.rows[0].status}`);
    } else {
        console.log('[FAIL] Settlement Record NOT Found');
    }

    const settlementTxnRes = await client.query(`SELECT * FROM transactions WHERE "userId" = (SELECT "userId" FROM businesses WHERE id = $1) ORDER BY "createdAt" DESC LIMIT 1`, [order.businessId]);
    
    if (settlementTxnRes.rowCount === 0) {
        console.log('[FAIL] No Settlement Transaction Found');
    } else {
        const txn = settlementTxnRes.rows[0];
        console.log(`[PASS] Transaction Found: ${txn.reference}`);
        console.log(`       Type: ${txn.type}`);
        console.log(`       Amount: ${txn.amount}`);
        console.log(`       Balance Before: ${txn.balanceBefore}`);
        console.log(`       Balance After: ${txn.balanceAfter}`);
        console.log(`       Metadata:`, txn.metadata);

        if (txn.metadata && txn.metadata.isSplit) {
            console.log('[PASS] Metadata indicates Split Payment');
        } else {
            console.log('[FAIL] Metadata missing isSplit flag');
        }

        if (Number(txn.balanceBefore) === Number(txn.balanceAfter)) {
            console.log('[PASS] Wallet Balance Unchanged (Skipped Update)');
        } else {
            console.log('[FAIL] Wallet Balance CHANGED!');
        }
    }

  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

run();
