import axios from 'axios';

const baseUrl = 'http://localhost:4000/v1';

async function verifyAdminEndpoints() {
  console.log('Starting Admin Endpoint Verification...');

  // 1. Login as Super Admin
  const loginPayload = {
    email: 'superadmin@qkly.com',
    password: '!535wiiwiw7QWRWT@3I3I!'
  };

  try {
    console.log('\n[1] Logging in as Super Admin...');
    const loginRes = await axios.post(`${baseUrl}/users/login`, loginPayload);

    if (!loginRes.data.data || !loginRes.data.data.accessToken) {
      console.error('Login Failed: No access token received.');
      return;
    }

    const accessToken = loginRes.data.data.accessToken;
    console.log('Login Successful! Token received.');
    const headers = { Authorization: `Bearer ${accessToken}` };

    // 2. Verify Transaction List
    console.log('\n[2] Verifying GET /admin/transactions/list...');
    try {
      const listRes = await axios.get(`${baseUrl}/admin/transactions/list?page=1&limit=5`, { headers });
      console.log('Status:', listRes.status);
      console.log('Data Count:', listRes.data.data.length);
      console.log('Meta:', listRes.data.meta);
      if (listRes.data.data.length > 0) {
        console.log('Latest Transaction:', JSON.stringify(listRes.data.data[0], null, 2));
        console.log('SUCCESS: Transactions are now visible.');
      } else {
        console.error('FAILURE: Still no transactions found.');
      }
    } catch (err) {
      console.error('List Endpoint Failed:', err.response ? err.response.data : err.message);
    }

    // 3. Verify Metrics
    console.log('\n[3] Verifying GET /admin/transactions/metrics...');
    try {
      const metricsRes = await axios.get(`${baseUrl}/admin/transactions/metrics`, { headers });
      console.log('Status:', metricsRes.status);
      console.log('Metrics Data:', JSON.stringify(metricsRes.data, null, 2));
    } catch (err) {
      console.error('Metrics Endpoint Failed:', err.response ? err.response.data : err.message);
    }

  } catch (error) {
    console.error('Login Failed:', error.response ? error.response.data : error.message);
  }
}

verifyAdminEndpoints();
