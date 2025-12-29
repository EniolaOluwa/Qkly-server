const axios = require('axios');

const API_URL = 'http://localhost:4000/v1';
const ORDER_ID = process.argv[2]; // Pass Order ID as argument

if (!ORDER_ID) {
    console.error('Please provide ORDER_ID as argument');
    process.exit(1);
}

// Credentials
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

async function run() {
    try {
        log(`=== VERIFYING ORDER ${ORDER_ID} & REFUNDING ===`, 'INFO');

        const merchantSession = await login(MERCHANT, 'Merchant');

        // 1. Verify Wallet Before
        log('Checking Wallet Balance...');
        const balRes1 = await axios.get(`${API_URL}/wallets/${merchantSession.userId}/balance`, { headers: merchantSession.headers });
        const wallet1 = balRes1.data.data;
        log(`[VERIFY] Merchant Wallet BEFORE Refund: ${wallet1.availableBalance}`, 'INFO');

        // 1.5 Verify Order Status
        log(`Checking Order ${ORDER_ID} Status...`);
        const orderRes = await axios.get(`${API_URL}/orders/${ORDER_ID}`, { headers: merchantSession.headers });
        const order = orderRes.data.data || orderRes.data;
        if (order.status === 'cancelled' || order.status === 'failed' || order.status === 'abandoned') {
            log(`[SUCCESS] Order is correctly marked as ${order.status} (Payment Declined/Failed)`, 'PASS');
            log('Skipping Refund step as payment was not successful.', 'INFO');
            return;
        }

        // 2. Refund (Only if Paid)
        log('Initiating Refund...', 'INFO');
        const refundRes = await axios.post(`${API_URL}/orders/refund`, {
            orderId: Number(ORDER_ID),
            amount: 50, // Refund 50 NGN
            reason: 'damaged_product', // Valid enum
            refundType: 'partial', // Lowercase
            refundMethod: 'wallet' // Lowercase
        }, { headers: merchantSession.headers });
        
        log('Refund Request Sent Successfully', 'PASS');
        if (refundRes.data.data) {
            console.log(refundRes.data.data);
        }

        // 3. Verify Wallet Debit
        log('Verifying Wallet Debit...');
        const balRes2 = await axios.get(`${API_URL}/wallets/${merchantSession.userId}/balance`, { headers: merchantSession.headers });
        const wallet2 = balRes2.data.data;
        log(`[VERIFY] Merchant Wallet AFTER Refund: ${wallet2.availableBalance}`, 'INFO');
        
        if (Number(wallet2.availableBalance) < Number(wallet1.availableBalance)) {
            log('SUCCESS: Wallet was debited!', 'PASS');
        } else {
            log('WARNING: Balance did not decrease. Check logic.', 'WARN');
        }

    } catch (e) {
        log(`Error: ${e.message}`, 'ERROR');
        if (e.response) {
            console.log('Response Data:', JSON.stringify(e.response.data, null, 2));
        }
    }
}

run();
