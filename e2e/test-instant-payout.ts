
import * as dotenv from 'dotenv';
dotenv.config();

const API_URL = 'http://localhost:4000/v1';

/**
 * Test script for MAIN_BALANCE mode instant payout
 * Uses Paystack test bank account for transfers
 * 
 * NOTE: Paystack test accounts:
 * - Account: 0000000000, Bank: 057 (Zenith) - for payment splits
 * - For transfers, you may need to use the Transfer Recipient API directly
 */
async function testInstantPayout() {
  console.log('=== Testing Instant Payout ===\n');

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

    // 2. Try to add bank using Zenith Bank test account
    console.log('[2] Adding Paystack Test Bank Account (Zenith - 057)...');
    const addBankRes = await fetch(`${API_URL}/bank-accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        accountNumber: '0000000000',
        bankCode: '057',  // Zenith Bank - standard test account
        currency: 'NGN'
      })
    });
    const addBankData = await addBankRes.json();

    let bankAccountId: number | null = null;

    if (addBankData.success) {
      console.log('✅ Bank account added:');
      console.log(`   ID: ${addBankData.data.id}`);
      console.log(`   Provider Recipient Code: ${addBankData.data.providerRecipientCode || 'NOT SET'}`);
      bankAccountId = addBankData.data.id;
    } else {
      console.log('⚠️ Bank add response:', addBankData.message);

      // Check if already exists
      const banksRes = await fetch(`${API_URL}/bank-accounts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const banksData = await banksRes.json();
      if (banksData.data?.length > 0) {
        bankAccountId = banksData.data[0].id;
        console.log(`   Using existing bank account ID: ${bankAccountId}`);
        console.log(`   Recipient Code: ${banksData.data[0].providerRecipientCode || 'NOT SET'}`);
      }
    }
    console.log('');

    // 3. Get wallet balance
    console.log('[3] Getting wallet balance...');
    const balanceRes = await fetch(`${API_URL}/wallets/balance`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const balanceData = await balanceRes.json();
    console.log(`   Available: ₦${balanceData.data?.availableBalance || 0}`);
    console.log('');

    if (!bankAccountId) {
      console.log('❌ No bank account available for testing.');
      return;
    }

    // 4. Test instant payout
    console.log('[4] Testing instant payout...');
    console.log('   (Will fail if no balance, but tests the flow)\n');

    const payoutRes = await fetch(`${API_URL}/wallets/instant-payout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        amount: 100,
        bankAccountId: bankAccountId,
        pin: '9999',
        narration: 'Test instant payout'
      })
    });
    const payoutData = await payoutRes.json();

    console.log('Payout Response:', JSON.stringify(payoutData, null, 2));

    console.log('\n=== Test Complete ===');

  } catch (error: any) {
    console.error('Test Failed:', error.message);
  }
}

testInstantPayout();
