
import * as dotenv from 'dotenv';
dotenv.config();

const API_URL = 'http://localhost:4000/v1';

async function testSettlementModes() {
  console.log('=== Testing Settlement Modes ===\n');

  try {
    // 1. Login as Merchant
    console.log('[1] Logging in as merchant...');
    const loginRes = await fetch(`${API_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'merchant1@test.com', password: 'Test@123' })
    });
    const loginData = await loginRes.json();

    if (!loginData.success) {
      console.log('❌ Login failed:', loginData.message);
      return;
    }

    const token = loginData.data.accessToken;
    console.log('✅ Logged in successfully\n');

    // 2. Get current wallet balance
    console.log('[2] Getting wallet balance...');
    const balanceRes = await fetch(`${API_URL}/wallets/balance`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const balanceData = await balanceRes.json();
    console.log('Wallet Balance:', JSON.stringify(balanceData.data, null, 2));
    console.log('');

    // 3. Check current system config for SETTLEMENT_MODE
    console.log('[3] Checking SETTLEMENT_MODE from env...');
    const settlementMode = process.env.SETTLEMENT_MODE || 'SUBACCOUNT';
    console.log(`Current SETTLEMENT_MODE: ${settlementMode}`);
    console.log('');

    if (settlementMode === 'MAIN_BALANCE') {
      console.log('=== MAIN_BALANCE Mode Tests ===\n');

      // Test instant payout endpoint
      console.log('[4] Testing instant payout endpoint...');
      const payoutRes = await fetch(`${API_URL}/wallets/instant-payout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: 100,
          bankAccountId: 1,
          pin: '9999',
          narration: 'Test instant payout'
        })
      });
      const payoutData = await payoutRes.json();

      if (payoutData.success) {
        console.log('✅ Instant payout response:', JSON.stringify(payoutData, null, 2));
      } else {
        console.log('⚠️ Payout response (expected if no balance):', payoutData.message);
      }

    } else {
      console.log('=== SUBACCOUNT Mode Tests ===\n');

      // Test regular withdrawal endpoint (T+1)
      console.log('[4] Testing regular withdrawal endpoint (T+1)...');
      const withdrawRes = await fetch(`${API_URL}/wallets/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: 100,
          bankAccountId: 1,
          pin: '9999',
          narration: 'Test withdrawal'
        })
      });
      const withdrawData = await withdrawRes.json();

      if (withdrawData.success) {
        console.log('✅ Withdrawal response:', JSON.stringify(withdrawData, null, 2));
      } else {
        console.log('⚠️ Withdrawal response (expected if no balance):', withdrawData.message);
      }
    }

    // 5. Check transactions
    console.log('\n[5] Getting recent transactions...');
    const txRes = await fetch(`${API_URL}/wallets/transactions?limit=5`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const txData = await txRes.json();
    console.log('Recent Transactions:', JSON.stringify(txData.data?.items?.slice(0, 3), null, 2));

    console.log('\n=== Test Complete ===');
    console.log(`Mode tested: ${settlementMode}`);
    console.log('To test the other mode, change SETTLEMENT_MODE in .env and restart server.');

  } catch (error: any) {
    console.error('Test Failed:', error.message);
  }
}

testSettlementModes();
