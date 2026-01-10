// Step 5: Verify BVN
async function verifyBvn() {
  console.log('\n🔷 STEP 5: VERIFY BVN (KYC)');
  
  // Create form data for BVN verification
  const formData = new FormData();
  formData.append('bvn', '2222222222'); // Test BVN (10 2s)
  
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
