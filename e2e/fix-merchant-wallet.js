require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USERNAME || 'qkly-server',
  password: process.env.DB_PASSWORD || 'password@12345',
  database: process.env.DB_NAME || 'ecommerce',
});

async function run() {
  try {
    await client.connect();
    
    // 1. Get Merchant User
    const userRes = await client.query(`SELECT id FROM users WHERE email = 'merchant1@test.com'`);
    if (userRes.rowCount === 0) throw new Error('Merchant user not found');
    const userId = userRes.rows[0].id;
    console.log(`Merchant User ID: ${userId}`);

    // 2. Check Wallet
    const walletRes = await client.query(`SELECT id FROM wallets WHERE "userId" = $1`, [userId]);
    
    if (walletRes.rowCount === 0) {
        console.log('Wallet missing. Creating dummy wallet...');
        // Insert dummy wallet
        await client.query(`
            INSERT INTO wallets 
            ("userId", "provider", "providerCustomerId", "providerAccountId", "accountNumber", "accountName", "bankName", "bankCode", "status", "currency", "availableBalance", "ledgerBalance", "pendingBalance", "activatedAt", "createdAt", "updatedAt")
            VALUES ($1, 'paystack', 'CUS_TEST', 'DVA_TEST', '1234567890', 'Test Merchant', 'Test Bank', '000', 'active', 'NGN', 0, 0, 0, NOW(), NOW(), NOW())
        `, [userId]);
        console.log('[PASS] Wallet Created');
    } else {
        console.log('[INFO] Wallet exists');
    }

  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

run();
