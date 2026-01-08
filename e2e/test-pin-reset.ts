
import * as dotenv from 'dotenv';
dotenv.config();

const API_URL = 'http://localhost:4000/v1';

async function testPinResetFlow() {
  console.log('=== Testing Transaction PIN Reset Flow ===\n');

  try {
    // 1. Login as Merchant
    console.log('[1] Logging in as merchant...');
    const loginRes = await fetch(`${API_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'merchant1@test.com', password: 'Test@123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.data.accessToken;
    const userId = loginData.data.userId;
    console.log('✅ Logged in successfully (User ID:', userId, ')\n');

    // 2. Check current restriction status
    console.log('[2] Checking current restriction status...');
    const checkRes = await fetch(`${API_URL}/users/transaction-pin/reset/restriction`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const checkData = await checkRes.json();
    console.log('Restriction Status:', JSON.stringify(checkData.data, null, 2));
    console.log('');

    // 3. Request PIN Reset (sends OTP)
    console.log('[3] Requesting PIN reset (sends OTP to phone/email)...');
    const requestRes = await fetch(`${API_URL}/users/transaction-pin/reset/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    const requestData = await requestRes.json();

    if (!requestData.success) {
      console.log('❌ Request failed:', requestData.message);
      return;
    }

    console.log('✅ OTP Request Response:', JSON.stringify(requestData.data, null, 2));
    console.log('');

    // For testing: Get OTP from database
    console.log('-------------------------------------------');
    console.log('� OTP was also sent to email: merchant1@test.com');
    console.log('💾 For testing, query OTP from database:');
    console.log(`   psql -d <DB_NAME> -c "SELECT otp FROM otps WHERE user_id = ${userId} AND purpose = 'transaction_pin_reset' ORDER BY created_at DESC LIMIT 1;"`);
    console.log('-------------------------------------------');
    console.log('');

    // Prompt for OTP
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const otp = await new Promise<string>((resolve) => {
      rl.question('Enter the OTP (from email or database): ', (answer: string) => {
        resolve(answer.trim());
      });
    });

    if (!otp) {
      console.log('No OTP provided, exiting.');
      rl.close();
      return;
    }

    // 4. Confirm PIN Reset
    console.log('\n[4] Confirming PIN reset with OTP...');
    const confirmRes = await fetch(`${API_URL}/users/transaction-pin/reset/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        otp: otp,
        newPin: '9999',
        confirmPin: '9999'
      })
    });
    const confirmData = await confirmRes.json();

    if (!confirmData.success) {
      console.log('❌ Confirm failed:', confirmData.message);
      rl.close();
      return;
    }

    console.log('✅ PIN Reset Response:', JSON.stringify(confirmData.data, null, 2));
    console.log('');

    // 5. Check restriction status again
    console.log('[5] Checking restriction status after reset...');
    const checkRes2 = await fetch(`${API_URL}/users/transaction-pin/reset/restriction`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const checkData2 = await checkRes2.json();
    console.log('Restriction Status:', JSON.stringify(checkData2.data, null, 2));

    if (checkData2.data?.restricted) {
      console.log('✅ 24-hour restriction is now ACTIVE');
    }
    console.log('');

    // 6. Try to withdraw (should fail)
    console.log('[6] Attempting withdrawal (should be blocked)...');
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
        narration: 'Test withdrawal after PIN reset'
      })
    });
    const withdrawData = await withdrawRes.json();

    if (!withdrawData.success && withdrawData.message?.includes('restricted')) {
      console.log('✅ Withdrawal correctly blocked:', withdrawData.message);
    } else if (!withdrawData.success) {
      console.log('⚠️ Withdrawal failed (different reason):', withdrawData.message);
    } else {
      console.log('❌ Unexpected: Withdrawal succeeded when it should be blocked');
    }

    rl.close();
    console.log('\n=== Test Complete ===');

  } catch (error: any) {
    console.error('Test Failed:', error.message);
  }
}

testPinResetFlow();
