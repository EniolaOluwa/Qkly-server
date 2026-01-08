
import * as dotenv from 'dotenv';
dotenv.config();

import * as crypto from 'crypto';

const API_URL = 'http://localhost:4000/v1';

async function runTest() {
  console.log('Starting Webhook T+1 Settlement Test (via Local Server)...');

  try {
    // 1. Login as Merchant
    const loginRes = await fetch(`${API_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'merchant1@test.com', password: 'Test@123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.data.accessToken;
    console.log('Merchant logged in.');

    // 2. Get existing bank accounts
    const bankAccountsRes = await fetch(`${API_URL}/bank-accounts`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const bankAccountsData = await bankAccountsRes.json();

    if (!bankAccountsData.data || bankAccountsData.data.length === 0) {
      console.error('FAILURE: No bank accounts found for merchant. Please add one first.');
      return;
    }

    const bankAccount = bankAccountsData.data[0];
    const accountNumber = bankAccount.accountNumber;
    console.log(`Using Bank Account: ${accountNumber}`);

    // 3. Get current balance
    const balanceRes = await fetch(`${API_URL}/wallets/balance`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const balanceData = await balanceRes.json();
    const balance = Number(balanceData.data.availableBalance);
    console.log(`Current Balance: ${balance}`);

    // 4. Get current transactions (for comparison)
    const txnBeforeRes = await fetch(`${API_URL}/wallets/transactions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const txnBeforeData = await txnBeforeRes.json();
    const txnCountBefore = txnBeforeData.data?.length || 0;
    console.log(`Transactions Before: ${txnCountBefore}`);

    // 5. Simulate Webhook
    const paystackRef = `TRF_TEST_${Date.now()}`;
    const webhookPayload = {
      event: 'transfer.success',
      data: {
        reference: paystackRef,
        amount: 50000, // 500.00 NGN in kobo
        currency: 'NGN',
        recipient: {
          details: {
            account_number: accountNumber,
            bank_code: '057'
          }
        },
        status: 'success'
      }
    };

    // Calculate Signature
    const secret = process.env.PAYSTACK_SECRET_KEY || '';
    const signature = crypto.createHmac('sha512', secret).update(JSON.stringify(webhookPayload)).digest('hex');

    console.log(`Simulating Paystack Webhook with Ref: ${paystackRef}...`);
    const webhookRes = await fetch(`${API_URL}/payment/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': signature
      },
      body: JSON.stringify(webhookPayload)
    });

    if (!webhookRes.ok) {
      console.error('Webhook request failed:', await webhookRes.text());
      return;
    }
    console.log('Webhook sent successfully.');

    // 6. Wait for processing
    await new Promise(r => setTimeout(r, 2000));

    // 7. Verify - Get transactions again
    const txnAfterRes = await fetch(`${API_URL}/wallets/transactions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const txnAfterData = await txnAfterRes.json();
    const transactions = txnAfterData.data || [];
    const txnCountAfter = transactions.length;
    console.log(`Transactions After: ${txnCountAfter}`);

    // Find transaction with Paystack Ref
    const resolvedTxn = transactions.find((t: any) =>
      t.providerReference === paystackRef || t.reference === paystackRef
    );

    if (resolvedTxn) {
      console.log('\n✅ SUCCESS: Found resolved transaction!');
      console.log(`  - ID: ${resolvedTxn.id}`);
      console.log(`  - Reference: ${resolvedTxn.reference}`);
      console.log(`  - Provider Ref: ${resolvedTxn.providerReference || 'N/A'}`);
      console.log(`  - Status: ${resolvedTxn.status}`);
      console.log(`  - Type: ${resolvedTxn.type}`);
      console.log(`  - Amount: ${resolvedTxn.amount}`);
      console.log(`  - Metadata Source: ${resolvedTxn.metadata?.source || 'N/A'}`);

      if (resolvedTxn.metadata?.source === 'AUTO_SETTLEMENT') {
        console.log('\n✅ VERIFICATION PASSED: Metadata correctly marked as AUTO_SETTLEMENT.');
      } else if (resolvedTxn.metadata?.matchType === 'AUTO_RESOLVED') {
        console.log('\n✅ VERIFICATION PASSED: Matched to existing pending payout.');
      } else {
        console.log('\n⚠️  WARNING: Metadata source not as expected. Check metadata:', JSON.stringify(resolvedTxn.metadata, null, 2));
      }
    } else {
      console.error('\n❌ FAILURE: Could not find transaction with matching Paystack reference.');
      console.log('Recent transactions:', transactions.slice(0, 3).map((t: any) => ({ ref: t.reference, provRef: t.providerReference, status: t.status })));
    }

  } catch (error: any) {
    console.error('Test Failed:', error.message);
    if (error.cause) console.error('Cause:', error.cause);
  }
}

runTest();
