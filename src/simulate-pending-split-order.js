require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'qkly_db',
});

async function run() {
  try {
    await client.connect();
    
    // 1. Get a Business for User 2 (Merchant who has wallet)
    const bizRes = await client.query(`SELECT id, "userId" FROM businesses WHERE "userId" = 2 LIMIT 1`);
    if (bizRes.rowCount === 0) {
        throw new Error('Business for User 2 not found! Run seed or fix data.');
    }
    const businessId = bizRes.rows[0].id;
    const userId = bizRes.rows[0].userId;

    // 2. Create Order
    const ref = `SPLIT-TEST-${Date.now()}`;
    const orderRes = await client.query(`
        INSERT INTO orders 
        ("businessId", "userId", "customerName", "customerEmail", "customerPhoneNumber", "deliveryAddress", "state", "total", "subtotal", "shippingFee", "tax", "discount", "paymentMethod", "deliveryMethod", "status", "paymentStatus", "orderReference", "transactionReference", "createdAt", "updatedAt")
        VALUES ($1, $2, 'Split Tester', 'split@test.com', '08000000000', 'Test Addr', 'Lagos', 5000, 5000, 0, 0, 0, 'card', 'pickup', 'pending', 'pending', $3, $3, NOW(), NOW())
        RETURNING id
    `, [businessId, userId, ref]);
    
    const orderId = orderRes.rows[0].id;

    // 3. Create OrderPayment
    await client.query(`
        INSERT INTO order_payments
        ("orderId", "paymentReference", "amount", "netAmount", "provider", "paymentMethod", "status", "currency")
        VALUES ($1, $2, 5000, 5000, 'paystack', 'card', 'pending', 'NGN')
    `, [orderId, ref]);

    console.log(`Created Pending Order ID: ${orderId}`);
    console.log(`Reference: ${ref}`);

  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

run();
