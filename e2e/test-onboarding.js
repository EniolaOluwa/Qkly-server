/**
 * E2E Onboarding Flow Test
 * 
 * This script tests the complete onboarding sequence:
 * 1. Register user
 * 2. Verify phone (you'll need to get OTP from DB)
 * 3. Create business
 * 4. Verify BVN/KYC
 * 5. Create PIN (completes onboarding)
 * 
 * Usage: node test-onboarding.js
 */

const BASE_URL = 'http://localhost:4000/v1';
const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');
const SESSION_FILE = './test-session.json';

// Test user data
let testUser = {
  email: `test${Date.now()}@example.com`,
  password: 'Test123456!',
  firstname: 'Test',
  lastname: 'User',
  phone: `080${Math.floor(10000000 + Math.random() * 90000000)}`, // Random Nigerian number
  deviceid: 'test-device-001',
  latitude: 6.5244,
  longitude: 3.3792,
};

let authToken = '';
let userId = 0;

// Load session if exists
function loadSession() {
  if (fs.existsSync(SESSION_FILE)) {
    const session = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
    testUser = session.testUser;
    authToken = session.authToken;
    userId = session.userId;
    console.log('📂 Loaded session for user:', testUser.email);
    return true;
  }
  return false;
}

// Save session
function saveSession() {
  fs.writeFileSync(SESSION_FILE, JSON.stringify({ testUser, authToken, userId }, null, 2));
  console.log('💾 Session saved');
}

// Helper function to make requests
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken && !options.skipAuth) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const json = await response.json();
  
  console.log(`\n📍 ${options.method || 'GET'} ${endpoint}`);
  console.log(`Status: ${response.status}`);
  console.log('Response:', JSON.stringify(json, null, 2));

  if (!response.ok) {
    throw new Error(`Request failed: ${JSON.stringify(json)}`);
  }

  // Return data from nested structure if it exists
  return json.data || json;
}

// Step 1: Register
async function register() {
  console.log('\n🔷 STEP 1: REGISTER USER');
  const data = await request('/users/register', {
    method: 'POST',
    body: JSON.stringify(testUser),
  });

  authToken = data.accessToken;
  userId = data.userId;

  console.log('✅ Registration successful!');
  console.log(`   User ID: ${userId}`);
  console.log(`   Onboarding Step: ${data.onboardingStep} - ${data.onboardingStepLabel}`);
  console.log(`   Completed: ${data.isOnboardingCompleted}`);
  
  saveSession();
  
  return data;
}

// Step 2: Generate Phone OTP
async function generatePhoneOtp() {
  console.log('\n🔷 STEP 2: GENERATE PHONE OTP');
  const data = await request('/users/generate-phone-otp', {
    method: 'POST',
    body: JSON.stringify({
      phone: testUser.phone,
    }),
  });

  console.log('✅ OTP generated!');
  console.log(`   ⚠️  CHECK DATABASE FOR OTP CODE`);
  console.log(`   Query: SELECT otp FROM otp WHERE "userId" = ${userId} AND "otpType" = 'phone' AND "isUsed" = false ORDER BY "createdAt" DESC LIMIT 1;`);
  
  return data;
}

// Step 3: Verify Phone OTP
async function verifyPhoneOtp(otpCode) {
  console.log('\n🔷 STEP 3: VERIFY PHONE OTP');
  const data = await request('/users/verify-phone-otp', {
    method: 'POST',
    body: JSON.stringify({
      phone: testUser.phone,
      otp: otpCode,
    }),
  });

  console.log('✅ Phone verified!');
  
  // Login again to get updated onboarding status
  const loginData = await request('/users/login', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({
      email: testUser.email,
      password: testUser.password,
      deviceid: testUser.deviceid,
    }),
  });

  authToken = loginData.accessToken;
  console.log(`   Onboarding Step: ${loginData.onboardingStep} - ${loginData.onboardingStepLabel}`);
  
  return data;
}

// Step 4: Create Business
async function createBusiness() {
  console.log('\n🔷 STEP 4: CREATE BUSINESS');
  
  // Create form data
  const formData = new FormData();
  formData.append('businessName', 'Test Business Ltd');
  formData.append('businessTypeId', '1'); // Assuming ID 1 exists
  formData.append('businessDescription', 'A test business for E2E testing');
  formData.append('location', 'Lagos, Nigeria');
  formData.append('storeName', `teststore${Date.now()}`);
  
  // Create a simple 1x1 PNG image
  const pngData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  formData.append('logo', pngData, {
    filename: 'logo.png',
    contentType: 'image/png',
  });

  try {
    const response = await axios.post(`${BASE_URL}/business`, formData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        ...formData.getHeaders(),
      },
    });

    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));

    const data = response.data.data || response.data;
    console.log('✅ Business created!');
    
    // Login again to get updated onboarding status
    const loginData = await request('/users/login', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password,
        deviceid: testUser.deviceid,
      }),
    });

    authToken = loginData.accessToken;
    console.log(`   Onboarding Step: ${loginData.onboardingStep} - ${loginData.onboardingStepLabel}`);
    
    return data;
  } catch (error) {
    console.log(`Status: ${error.response?.status}`);
    console.log('Response:', JSON.stringify(error.response?.data, null, 2));
    throw new Error(`Business creation failed: ${JSON.stringify(error.response?.data || error.message)}`);
  }
}

// Step 5: Verify BVN

// Step 5: Verify BVN
async function verifyBvn() {
  console.log('\n🔷 STEP 5: VERIFY BVN (KYC)');
  
  // Create form data for BVN verification
  const formData = new FormData();
  formData.append('bvn', '22222222222'); // Test BVN (11 2s)
  
  // Create a simple 1x1 PNG image as selfie
  const pngData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  formData.append('selfie_image', pngData, {
    filename: 'selfie.png',
    contentType: 'image/png',
  });

  try {
    const response = await axios.post(`${BASE_URL}/users/verify-kyc`, formData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        ...formData.getHeaders(),
      },
    });

    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));

    const data = response.data.data || response.data;
    console.log('✅ BVN verified!');
    
    // Login again to get updated onboarding status
    const loginData = await request('/users/login', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password,
        deviceid: testUser.deviceid,
      }),
    });

    authToken = loginData.accessToken;
    console.log(`   Onboarding Step: ${loginData.onboardingStep} - ${loginData.onboardingStepLabel}`);
    
    return data;
  } catch (error) {
    console.log(`Status: ${error.response?.status}`);
    console.log('Response:', JSON.stringify(error.response?.data, null, 2));
    console.log('⚠️  BVN verification failed (expected with test data)');
    console.log('   Manually update database:');
    console.log(`   UPDATE user_kyc SET status = 'verified', "verifiedAt" = NOW() WHERE "userId" = ${userId};`);
    console.log(`   UPDATE user_onboarding SET "currentStep" = 'kyc_verification' WHERE "userId" = ${userId};`);
  }
}


// Step 6: Create PIN
async function createPin() {
  console.log('\n🔷 STEP 6: CREATE AUTHENTICATION PIN');
  
  // Generate OTP for PIN creation
  console.log('   6a. Generating PIN creation OTP...');
  await request('/users/generate-create-pin-otp', {
    method: 'POST',
  });
  
  console.log('   ⚠️  CHECK DATABASE FOR OTP CODE');
  console.log(`   Query: SELECT otp FROM otp WHERE "userId" = ${userId} AND purpose = 'pin_creation' AND "isUsed" = false ORDER BY "createdAt" DESC LIMIT 1;`);
  console.log('\n   Enter OTP code to continue...');
  console.log('\n⏸️  PAUSED - Please provide the PIN creation OTP from database');
  console.log('   Run: node test-onboarding.js pin <pin-otp>');
}

async function verifyPinOtpAndCreatePin(otpCode, pin = '1234') {
  console.log('\n   6b. Verifying OTP...');
  const verifyData = await request('/users/verify-create-pin-otp', {
    method: 'POST',
    body: JSON.stringify({ otp: otpCode }),
  });

  const reference = verifyData.reference;
  console.log(`   ✅ OTP verified! Reference: ${reference}`);

  console.log('\n   6c. Creating PIN...');
  const pinData = await request('/users/create-pin', {
    method: 'POST',
    body: JSON.stringify({
      pin: pin,
      reference: reference,
    }),
  });

  console.log('✅ PIN created!');
  
  // Login again to get final onboarding status
  const loginData = await request('/users/login', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({
      email: testUser.email,
      password: testUser.password,
      deviceid: testUser.deviceid,
    }),
  });

  authToken = loginData.accessToken;
  console.log(`   Onboarding Step: ${loginData.onboardingStep} - ${loginData.onboardingStepLabel}`);
  console.log(`   Onboarding Completed: ${loginData.isOnboardingCompleted}`);
  
  if (loginData.isOnboardingCompleted) {
    console.log('\n🎉 ONBOARDING COMPLETE! 🎉');
  }
  
  return pinData;
}

// Main test flow
async function runTest() {
  try {
    console.log('🚀 Starting E2E Onboarding Test\n');
    console.log('Test User:', testUser.email);
    
    // Step 1: Register
    await register();
    
    // Step 2: Generate Phone OTP
    await generatePhoneOtp();
    
    console.log('\n⏸️  PAUSED - Please provide the OTP from database');
    console.log('   Run this script with: node test-onboarding.js <phone-otp>');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Interactive mode
async function continueTest(phoneOtp, pinOtp = null, pin = '1234') {
  try {
    // Load session from previous run
    if (!loadSession()) {
      console.error('❌ No session found. Please run without arguments first to register.');
      process.exit(1);
    }
    
    if (phoneOtp && !pinOtp) {
      // Continue from phone verification
      await verifyPhoneOtp(phoneOtp);
      await createBusiness();
      await verifyBvn();
      await createPin();
      
      console.log('\n⏸️  PAUSED - Please provide the PIN creation OTP from database');
      console.log('   Run: node test-onboarding.js pin <pin-otp>');
    } else if (phoneOtp && pinOtp) {
      // Complete the flow
      await verifyPhoneOtp(phoneOtp);
      await createBusiness();
      await verifyBvn();
      await verifyPinOtpAndCreatePin(pinOtp, pin);
    }
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args[0] === 'pin' && args[1]) {
  // Just complete the PIN step
  (async () => {
    try {
      if (!loadSession()) {
        console.error('❌ No session found. Please run the full test first.');
        process.exit(1);
      }
      await verifyPinOtpAndCreatePin(args[1], args[2] || '1234');
      console.log('\n✅ ONBOARDING COMPLETE!');
    } catch (error) {
      console.error('\n❌ Test failed:', error.message);
      process.exit(1);
    }
  })();
} else if (args[0] === 'continue' && args[1] && args[2]) {
  continueTest(args[1], args[2], args[3] || '1234');
} else if (args[0] && args[0] !== 'continue' && args[0] !== 'pin') {
  continueTest(args[0], args[1], args[2] || '1234');
} else {
  runTest();
}
