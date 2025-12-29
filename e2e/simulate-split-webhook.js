require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');

const SECRET = process.env.PAYSTACK_SECRET_KEY || 'sk_test_1234567890'; // Use what's in env or default
const REFERENCE = process.argv[2]; 

if (!REFERENCE) {
    console.error('Please provide reference as argument');
    process.exit(1);
}

const payload = {
  event: 'charge.success',
  data: {
    reference: REFERENCE,
    status: 'SUCCESS', // Fixed: Uppercase to match OrderService logic
    amount: 500000, // 5000.00
    currency: 'NGN',
    paid_at: new Date().toISOString(),
    customer: { email: 'split@test.com' },
    metadata: {},
    subaccount: {
        id: 12345,
        subaccount_code: 'ACCT_TEST_SPLIT',
        split_share: 490000
    }
  }
};

const signature = crypto.createHmac('sha512', SECRET)
  .update(JSON.stringify(payload))
  .digest('hex');

async function run() {
    try {
        console.log(`Sending Webhook for ${REFERENCE}...`);
        const res = await axios.post('http://localhost:4000/v1/payment/webhook', payload, {
            headers: { 'x-paystack-signature': signature }
        });
        console.log('Webhook Response:', res.status, res.data);
    } catch (e) {
        console.error('Error:', e.message);
        if(e.response) console.error(e.response.data);
    }
}

run();
