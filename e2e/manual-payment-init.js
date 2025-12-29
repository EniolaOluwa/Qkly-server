const axios = require('axios');

const API_URL = 'http://localhost:4000/v1';

// Credentials
const BUYER = { email: 'john.doe@example.com', password: 'securePassword123' };
const MERCHANT = { email: 'merchant1@test.com', password: 'Test@123' };

async function log(msg, type = 'INFO') {
    const color = type === 'ERROR' ? '\x1b[31m' : type === 'PASS' ? '\x1b[32m' : '\x1b[34m';
    console.log(`${color}[${type}] ${msg}\x1b[0m`);
}

async function login(creds, role) {
    try {
        const res = await axios.post(`${API_URL}/users/login`, creds);
        return { 
            token: res.data.data.accessToken, 
            headers: { Authorization: `Bearer ${res.data.data.accessToken}` },
            userId: res.data.data.userId
        };
    } catch (e) {
        log(`Login Failed: ${e.message}`, 'ERROR');
        throw e;
    }
}

async function getMerchantBusinessId(headers) {
    const res = await axios.get(`${API_URL}/business/my-business`, { headers });
    return res.data.data.id;
}

async function run() {
    try {
        log('=== MANUAL PAYMENT SETUP ===', 'INFO');

        const merchantSession = await login(MERCHANT, 'Merchant');
        const buyerSession = await login(BUYER, 'Buyer');
        const businessId = await getMerchantBusinessId(merchantSession.headers);

        // 1. Create Order
        const cartSessionId = `sess-${Date.now()}-MANUAL`;
        const cartHeaders = { ...buyerSession.headers, 'x-session-id': cartSessionId };
        
        await axios.post(`${API_URL}/cart/items`, { productId: 1, quantity: 1 }, { headers: cartHeaders });
        
        const orderRes = await axios.post(`${API_URL}/orders/cart`, {
            paymentMethod: 'card',
            deliveryMethod: 'pickup',
            deliveryAddress: '123 Real Pay St',
            state: 'Lagos',
            customerName: 'Real Buyer',
            customerEmail: BUYER.email,
            customerPhoneNumber: '+2348000000000',
            businessId: businessId // Explicitly set business
        }, { headers: cartHeaders });
        
        const orderId = orderRes.data.id || orderRes.data.data.id;
        log(`Created Order ID: ${orderId}`, 'PASS');

        // 2. Initialize Payment
        const initRes = await axios.post(`${API_URL}/orders/payment/initialize`, {
            orderId: orderId,
            redirectUrl: 'http://localhost:3000/callback', // Doesn't matter for manual test
            paymentMethod: 'card'
        }, { headers: buyerSession.headers });

        const data = initRes.data.data || initRes.data;
        const authUrl = data.authorizationUrl;

        console.log('\n==================================================');
        console.log('  PAYMENT LINK GENERATED');
        console.log('==================================================');
        // DEBUG LOG
        if (data.splitDebug) {
             console.log('  [DEBUG] SPLIT PAYMENT INFO:');
             console.log(JSON.stringify(data.splitDebug, null, 2));
        } else {
             console.log('  [DEBUG] NO SPLIT INFO FOUND');
        }
        console.log('==================================================');
        console.log(`\nURL: ${authUrl}\n`);
        console.log(`Order ID: ${orderId}`);
        console.log('1. Click the link above.');
        console.log('2. Complete the payment on Paystack (Use a Test Card).');
        console.log('3. Once "Payment Successful", tell me to proceed with verification.');
        console.log('==================================================\n');

    } catch (e) {
        log(`Error: ${e.message}`, 'ERROR');
        if (e.response) console.log(e.response.data);
    }
}

run();
