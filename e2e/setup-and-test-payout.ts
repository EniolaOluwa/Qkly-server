
import * as dotenv from 'dotenv';
dotenv.config();

const API_URL = 'http://localhost:4000/v1';

/**
 * Complete setup and test for instant payout
 * 1. Register merchant
 * 2. Login
 * 3. Create transaction PIN
 * 4. Add bank account (with Transfer Recipient)
 * 5. Test instant payout
 */
async function setupAndTestInstantPayout() {
  console.log('=== Setting Up Test Data for Instant Payout ===\n');

  let token: string | null = null;

  try {
    // 1. Try to login first (in case merchant exists)
    console.log('[1] Trying to login as merchant...');
    let loginRes = await fetch(`${API_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'merchant1@test.com', password: 'Test@123' })
    });
    let loginData = await loginRes.json();

    if (loginData.success) {
      token = loginData.data.accessToken;
      console.log('✅ Logged in successfully\n');
    } else {
      // Register new merchant
      console.log('   Merchant not found. Registering...\n');

      const registerRes = await fetch(`${API_URL}/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'merchant1@test.com',
          password: 'Test@123',
          firstName: 'John',
          lastName: 'Merchant',
          phone: '+2348012345671',
          userType: 'user'
        })
      });
      const registerData = await registerRes.json();

      if (registerData.success) {
        console.log('✅ Merchant registered');

        // Login after registration
        loginRes = await fetch(`${API_URL}/users/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'merchant1@test.com', password: 'Test@123' })
        });
        loginData = await loginRes.json();

        if (loginData.success) {
          token = loginData.data.accessToken;
          console.log('✅ Logged in successfully\n');
        }
      } else {
        console.log('❌ Registration failed:', registerData.message);
        return;
      }
    }

    if (!token) {
      console.log('❌ Could not get token');
      return;
    }

    // 2. Create Transaction PIN
    console.log('[2] Creating transaction PIN (1234)...');
    const pinRes = await fetch(`${API_URL}/users/transaction-pin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        pin: '1234',
        confirmPin: '1234'
      })
    });
    const pinData = await pinRes.json();
    console.log('PIN Response:', pinData.message || pinData.data?.message || 'Done');
    console.log('');

    // 3. Add bank account with Transfer Recipient
    console.log('[3] Adding bank account (Zenith Test Account)...');
    const addBankRes = await fetch(`${API_URL}/bank-accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        accountNumber: '0000000000',
        bankCode: '057',  // Zenith Bank
        currency: 'NGN'
      })
    });
    const addBankData = await addBankRes.json();

    let bankAccountId: number | null = null;

    if (addBankData.success) {
      bankAccountId = addBankData.data.id;
      console.log('✅ Bank account added');
      console.log(`   ID: ${bankAccountId}`);
      console.log(`   Recipient Code: ${addBankData.data.providerRecipientCode || 'NOT SET'}`);
    } else {
      console.log('⚠️ Bank response:', addBankData.message);

      // Get existing
      const banksRes = await fetch(`${API_URL}/bank-accounts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const banksData = await banksRes.json();
      if (banksData.data?.length > 0) {
        bankAccountId = banksData.data[0].id;
        console.log(`   Using existing ID: ${bankAccountId}`);
        console.log(`   Recipient Code: ${banksData.data[0].providerRecipientCode || 'NOT SET'}`);
      }
    }
    console.log('');

    // 4. Get wallet balance
    console.log('[4] Getting wallet balance...');
    const balanceRes = await fetch(`${API_URL}/wallets/balance`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const balanceData = await balanceRes.json();
    console.log(`   Available: ₦${balanceData.data?.availableBalance || 0}`);
    console.log('');

    if (!bankAccountId) {
      console.log('❌ No bank account available');
      return;
    }

    // 5. Test instant payout
    console.log('[5] Testing instant payout with PIN 1234...');
    const payoutRes = await fetch(`${API_URL}/wallets/instant-payout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        amount: 100,
        bankAccountId: bankAccountId,
        pin: '1234',
        narration: 'Test instant payout'
      })
    });
    const payoutData = await payoutRes.json();

    console.log('Payout Response:', JSON.stringify(payoutData, null, 2));

    console.log('\n=== Setup & Test Complete ===');

  } catch (error: any) {
    console.error('Failed:', error.message);
  }
}

setupAndTestInstantPayout();
