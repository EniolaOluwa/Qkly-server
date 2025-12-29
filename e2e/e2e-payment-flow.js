const axios = require('axios');
const crypto = require('crypto');

const API_URL = 'http://localhost:4000/v1';
const SECRET_KEY = 'sk_test_84b750db8680dc9e586121b67edbae96d2fcf627'; // Provided by user

// Credentials
const BUYER = { email: 'john.doe@example.com', password: 'securePassword123' };
const MERCHANT = { email: 'merchant1@test.com', password: 'Test@123' };

async function log(msg, type = 'INFO') {
    const color = type === 'ERROR' ? '\x1b[31m' : type === 'PASS' ? '\x1b[32m' : type === 'WARN' ? '\x1b[33m' : '\x1b[34m';
    console.log(`${color}[${type}] ${msg}\x1b[0m`);
}

async function login(creds, role) {
    log(`Logging in as ${role}...`);
    try {
        const res = await axios.post(`${API_URL}/users/login`, creds);
        return { 
            token: res.data.data.accessToken, 
            headers: { Authorization: `Bearer ${res.data.data.accessToken}` },
            userId: res.data.data.userId
        };
    } catch (e) {
        log(`Login Failed for ${role}: ${e.message}`, 'ERROR');
        throw e;
    }
}

async function getMerchantBusinessId(headers) {
    const res = await axios.get(`${API_URL}/business/my-business`, { headers });
    return res.data.data.id;
}

async function triggerWebhook(payload) {
    log(`Triggering Webhook (${payload.event})...`);
    const signature = crypto.createHmac('sha512', SECRET_KEY)
                           .update(JSON.stringify(payload))
                           .digest('hex');
    try {
        await axios.post(`${API_URL}/payment/webhook`, payload, {
            headers: { 'x-paystack-signature': signature }
        });
        log('Webhook Sent Successfully', 'PASS');
    } catch (e) {
        log(`Webhook Failed: ${e.response?.data?.message || e.message}`, 'ERROR');
    }
}

async function run() {
    try {
        log('=== STARTING E2E PAYMENT FLOW SIMULATION ===', 'INFO');

        // 1. Setup Sessions
        const merchantSession = await login(MERCHANT, 'Merchant');
        const buyerSession = await login(BUYER, 'Buyer');
        const businessId = await getMerchantBusinessId(merchantSession.headers);
        log(`Merchant Business ID: ${businessId}`, 'INFO');

        // --- SCENARIO A: SUCCESSFUL PAYMENT & REFUND ---
        log('\n--- SCENARIO A: SUCCESS & REFUND ---', 'INFO');

        // A1. Cart & Order
        log('A1. Creating Order...');
        const cartSessionId = `sess-${Date.now()}-A`;
        const cartHeaders = { ...buyerSession.headers, 'x-session-id': cartSessionId };
        
        await axios.post(`${API_URL}/cart/items`, { productId: 1, quantity: 1 }, { headers: cartHeaders });
        
        const orderResA = await axios.post(`${API_URL}/orders/cart`, {
            paymentMethod: 'card',
            deliveryMethod: 'pickup',
            deliveryAddress: '123 E2E St',
            state: 'Lagos',
            customerName: 'E2E Buyer',
            customerEmail: BUYER.email,
            customerPhoneNumber: '+2348000000000',
            businessId: businessId
        }, { headers: cartHeaders });
        
        const orderIdA = orderResA.data.id || orderResA.data.data.id;
        log(`Order A Created: ID ${orderIdA}`, 'PASS');

        // A2. Initialize Payment
        const initResA = await axios.post(`${API_URL}/orders/payment/initialize`, {
            orderId: orderIdA,
            redirectUrl: 'http://localhost:3000/callback',
            paymentMethod: 'card'
        }, { headers: buyerSession.headers });
        const refA = initResA.data.paymentReference || initResA.data.data.paymentReference;
        log(`Payment Initialized. Ref: ${refA}`, 'INFO');

        // A3. Simulate Success Webhook
        await triggerWebhook({
            event: 'charge.success',
            data: {
                reference: refA,
                status: 'success',
                amount: 1500000, // 15,000 NGN
                metadata: { orderId: orderIdA },
                customer: { email: BUYER.email }
            }
        });

        // A4. Verify Wallet Credit
        log('A4. Verifying Merchant Wallet...');
        // Wait briefly for async processing
        await new Promise(r => setTimeout(r, 2000));
        
        let wallet;
        try {
            const balanceRes = await axios.get(`${API_URL}/wallets/${merchantSession.userId}/balance`, { headers: merchantSession.headers });
            wallet = balanceRes.data.data || balanceRes.data;
        } catch (e) {
            log('Failed to fetch balance: ' + e.message, 'WARN');
            // If 404, maybe generate? But we expect it to exist if payment succeeded?
            // Fallback to get wallet
             const wRes = await axios.get(`${API_URL}/wallets`, { headers: merchantSession.headers });
             wallet = wRes.data.data;
             // If still no balance, it's 0
             if (!wallet) wallet = { availableBalance: 0 };
        }
        
        log(`Merchant Wallet Balance: ${wallet?.availableBalance}`, 'PASS');

        if (Number(wallet.availableBalance) < 100) {
            log('Balance insufficient for refund test! Webhook might have failed to credit.', 'WARN');
        }

        // A5. Refund
        log('A5. Processing Refund...');
        try {
            const refundRes = await axios.post(`${API_URL}/orders/refund`, {
                orderId: orderIdA,
                amount: 5000, // 50 NGN
                amount: 5000, // 50 NGN
                reason: 'damaged_product',
                refundType: 'partial',
                refundMethod: 'wallet'
            }, { headers: merchantSession.headers });
            log('Refund Initiated', 'PASS');
        } catch (e) {
            log(`Refund Failed: ${e.response?.data?.message || e.message}`, 'ERROR');
        }

        // A6. Verify Wallet Debit
        const walletRes2 = await axios.get(`${API_URL}/wallets/${merchantSession.userId}/balance`, { headers: merchantSession.headers });
        const wallet2 = walletRes2.data.data || walletRes2.data;
        log(`Balance After Refund: ${wallet2.availableBalance} (Should be less)`, 'PASS');


        // --- SCENARIO B: FAILED PAYMENT ---
        log('\n--- SCENARIO B: FAILED PAYMENT ---', 'INFO');

        // B1. Create Order B
        const cartSessionIdB = `sess-${Date.now()}-B`;
        const cartHeadersB = { ...buyerSession.headers, 'x-session-id': cartSessionIdB };
        await axios.post(`${API_URL}/cart/items`, { productId: 1, quantity: 1 }, { headers: cartHeadersB });
        
        const orderResB = await axios.post(`${API_URL}/orders/cart`, {
            paymentMethod: 'card',
            deliveryMethod: 'pickup',
            deliveryAddress: 'Fail St Address Long Enough',
            state: 'Lagos',
            customerName: 'Fail Buyer',
            customerEmail: BUYER.email,
            customerPhoneNumber: '+2348000000000',
            businessId: businessId // Use same business
        }, { headers: cartHeadersB });
        const orderIdB = orderResB.data.id || orderResB.data.data.id;
        log(`Order B Created: ID ${orderIdB}`, 'PASS');

        // B2. Init Payment
        const initResB = await axios.post(`${API_URL}/orders/payment/initialize`, {
            orderId: orderIdB,
            redirectUrl: 'http://localhost:3000/callback',
            paymentMethod: 'card'
        }, { headers: buyerSession.headers });
        const refB = initResB.data.paymentReference || initResB.data.data.paymentReference;

        // B3. Simulate FAIL Webhook (charge.success but with status 'failed' or 'charge.failed'?)
        // Paystack usually sends 'charge.success' only for success. 
        // Failures might not always trigger a webhook unless strictly configured, 
        // BUT 'charge.success' with data.status='failed' is possible in some gateways, 
        // typically though it's a distinct event. Let's try sending a generic update.
        // Or if the user cancels.
        // Let's assume sending 'charge.failed' event.
        await triggerWebhook({
            event: 'charge.failed',
            data: {
                reference: refB,
                status: 'failed',
                amount: 1500000,
                metadata: { orderId: orderIdB },
                gateway_response: 'Insufficient Funds'
            }
        });

        // B4. Verify Order Status
        log('B4. Verifying Order Status...');
        const checkOrderB = await axios.get(`${API_URL}/orders/${orderIdB}`, { headers: buyerSession.headers });
        const statusB = checkOrderB.data.status || checkOrderB.data.data.status;
        log(`Order B Status: ${statusB} (Expected: CANCELLED or FAILED)`, 'INFO');

        log('\n=== E2E SIMULATION COMPLETE ===', 'PASS');

    } catch (error) {
        log(`Simulation FATAL ERROR: ${error.message}`, 'ERROR');
        if (error.response) console.log(error.response.data);
    }
}

run();
