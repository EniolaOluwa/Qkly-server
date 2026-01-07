
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import * as readline from 'readline';

const API_URL = 'http://localhost:4000/v1';
const SUPER_ADMIN = { email: 'superadmin@qkly.com', password: '!535wiiwiw7QWRWT@3I3I!' };

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query: string): Promise<string> => {
  return new Promise(resolve => rl.question(query, resolve));
};

async function runE2E() {
  console.log('\nStarting E2E Guest Checkout Test (Settlement Verification)');
  const sessionId = uuidv4();
  console.log(`Session ID: ${sessionId}\n`);

  try {
    // 1. Add to Cart (using new array format)
    console.log('[1] Adding item to cart...');
    const addToCartRes = await axios.post(`${API_URL}/cart/items`, {
      items: [
        { productId: 1, quantity: 1 }
      ]
    }, { headers: { 'x-session-id': sessionId } });
    console.log(`Cart updated: ${addToCartRes.data.data.itemCount} items\n`);

    // 2. Create Order
    console.log('[2] Creating order from cart...');
    const createOrderRes = await axios.post(`${API_URL}/orders/cart`, {
      businessId: 1,
      customerName: 'Guest Tester',
      customerEmail: `guest-${Date.now()}@example.com`,
      customerPhoneNumber: '+2348000000000',
      deliveryAddress: '123 Test St, Lagos',
      state: 'Lagos',
      city: 'Ikeja',
      paymentMethod: 'card',
      deliveryMethod: 'standard',
      notes: 'Test Order Settlement'
    }, { headers: { 'x-session-id': sessionId } });

    const orderId = createOrderRes.data.data.id;
    const orderRef = createOrderRes.data.data.orderReference;
    console.log(`Order created! ID: ${orderId} Ref: ${orderRef}\n`);

    // 3. Initialize Payment
    console.log('[3] Initializing payment...');
    const initPaymentRes = await axios.post(`${API_URL}/orders/payment/initialize`, {
      orderId: orderId,
      paymentMethod: 'card'
    });
    console.log('Payment Initialized!');

    const authUrl = initPaymentRes.data.data.authorizationUrl;
    const paymentRef = initPaymentRes.data.data.paymentReference;

    console.log(`
------------------------------------------------
AUTHORIZATION URL: ${authUrl}
PAYMENT REFERENCE: ${paymentRef}
------------------------------------------------
`);

    console.log('>>> ACTION REQUIRED <<<');
    console.log('1. Open the Authorization URL in your browser.');
    console.log('2. Complete the payment using Paystack Test Card (Success).');
    await askQuestion('Press ENTER to confirm "I have paid"...');

    // 5. Verify Payment
    console.log('\n[5] Verifying Payment Status...');
    const verifyRes = await axios.post(`${API_URL}/orders/payment/verify`, {
      transactionReference: paymentRef
    });
    console.log(`Payment Verification Result: ${verifyRes.data.message}`);
    console.log(`Order Payment Status: ${verifyRes.data.data.paymentStatus}`);

    if (verifyRes.data.data.paymentStatus === 'paid') {
      console.log('SUCCESS: Order verified as PAID.\n');

      // 6. Wait for Settlement (Implicit in system flow)
      console.log('[6] Waiting 5 seconds for Settlement processing...');
      await new Promise(r => setTimeout(r, 5000));

      // 7. Verify Admin Transactions (Check if Settlement Transaction appeared)
      console.log('[7] Checking Admin Transactions List...');
      // Login Admin
      const loginRes = await axios.post(`${API_URL}/users/login`, SUPER_ADMIN);
      const token = loginRes.data.data.accessToken;

      const txnsRes = await axios.get(`${API_URL}/admin/transactions/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Admin Transactions Count:', txnsRes.data.data.length);
      console.log('Latest Transaction:', JSON.stringify(txnsRes.data.data[0], null, 2));

      if (txnsRes.data.data.length > 0) {
        console.log('SUCCESS: Transaction found in Admin list!');
      } else {
        console.log('FAILURE: No transactions found. System did not create Settlement transaction?');
      }

    } else {
      console.log('FAILURE: Order not paid.');
    }

  } catch (error) {
    console.error('Test Failed:', error);
    if (axios.isAxiosError(error)) {
      console.error('Axios Error Data:', error.response?.data);
      console.error('Axios Error Status:', error.response?.status);
    }
  } finally {
    rl.close();
  }
}

runE2E();
