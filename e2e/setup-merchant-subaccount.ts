import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import axios from 'axios';
dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE || process.env.DB_NAME,
  synchronize: false,
});

async function run() {
  try {
    await dataSource.initialize();
    console.log('Connected to DB');

    // 1. Create Subaccount via Paystack API directly
    console.log('Creating Real Test Subaccount on Paystack...');
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) throw new Error('PAYSTACK_SECRET_KEY not found in env');

    let subaccountCode = '';

    try {
      const res = await axios.post(
        'https://api.paystack.co/subaccount',
        {
          business_name: 'Test Merchant Store',
          settlement_bank: '057', // Zenith Bank (Test Mode Supported)
          account_number: '0000000000', // Valid Test Account
          percentage_charge: 0,
          description: 'E2E Test Subaccount'
        },
        {
          headers: { Authorization: `Bearer ${secretKey}` }
        }
      );
      subaccountCode = res.data.data.subaccount_code;
      console.log(`Created Subaccount: ${subaccountCode}`);
    } catch (apiErr: any) {
      if (apiErr.response?.data?.message === 'Account number already exists for this bank') {
        console.log("Account exists, assuming ACCT_TEST_REUSED (fallback)");
        // In a real scenario we should fetch it or use a random one, but for test bank 0000000000 it might be unique constraint?
        // Actually Paystack allows multiple subaccounts for same account usually, or maybe not.
        // Let's assume we can reuse a known code if creating fails, OR try generating a unique subaccount?
        // Test Account '0000000000' is generic.
        console.log('Error creating:', apiErr.response?.data);
        // Fallback: If we can't create, we can't test strict split. 
        // EXCEPT if we assume the user has a valid key.
      }
      throw new Error(`Paystack API Failed: ${apiErr.response?.data?.message || apiErr.message}`);
    }

    console.log(`Updating Business 1 payment account with ${subaccountCode}...`);

    try {
      await dataSource.query(`
            INSERT INTO business_payment_accounts (business_id, provider_subaccount_code, status, provider, created_at, updated_at)
            VALUES (1, '${subaccountCode}', 'active', 'paystack', NOW(), NOW())
            ON CONFLICT (business_id) DO UPDATE
            SET provider_subaccount_code = '${subaccountCode}', status = 'active';
        `);
      console.log('Success with snake_case');
    } catch (e) {
      console.log('snake_case failed, trying camelCase (quoted)...', e.message);
      await dataSource.query(`
            INSERT INTO "business_payment_accounts" ("businessId", "providerSubaccountCode", "status", "provider", "createdAt", "updatedAt")
            VALUES (1, '${subaccountCode}', 'active', 'paystack', NOW(), NOW())
            ON CONFLICT ("businessId") DO UPDATE
            SET "providerSubaccountCode" = '${subaccountCode}', "status" = 'active';
        `);
      console.log('Success with camelCase');
    }

    console.log('Merchant Setup Complete');
    process.exit(0);
  } catch (err) {
    console.error('Script failed', err);
    process.exit(1);
  }
}

run();
