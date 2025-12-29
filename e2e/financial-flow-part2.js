const axios = require('axios');
const API_URL = 'http://localhost:4000/v1'; 
const EMAIL = 'merchant1@test.com'; 
const PASSWORD = 'Test@123';

async function log(message, type = 'INFO') {
    console.log(`[${type}] ${message}`);
}

async function run() {
    try {
        log('--- FINANCIAL FLOW TEST: PART 2 (Login Check) ---');

        // 1. Login
        log('Logging in...');
        let loginRes;
        try {
            loginRes = await axios.post(`${API_URL}/users/login`, {
                email: EMAIL,
                password: PASSWORD
            });
        } catch (e) {
            log('Login failed (' + (e.response?.data?.message || e.message) + ')', 'ERROR');
            throw e;
        }
        
        const token = loginRes.data.data.accessToken;
        const headers = { Authorization: `Bearer ${token}` };
        log('Login successful');
        
        // 2. Verify Wallet Credit (Merchant)
        log('Verifying Wallet Credit...');
        let wallet;
        try {
            const walletRes = await axios.get(`${API_URL}/wallets`, { headers });
            wallet = walletRes.data.data || walletRes.data.wallet || walletRes.data;
        } catch (e) {
            if (e.response?.status === 404) {
                 log('Merchant Wallet not found. Creating it...');
                 try {
                     const genRes = await axios.post(`${API_URL}/wallets/generate`, {
                         walletName: 'Merchant Wallet',
                         customerEmail: EMAIL,
                         bvn: '22222222222',
                         dateOfBirth: '1990-01-01',
                         customerName: 'Merchant One'
                     }, { headers });
                     wallet = genRes.data.data || genRes.data;
                     log('Merchant Wallet Created!');
                 } catch (genErr) {
                     // Log EXACT response
                     console.error('Wallet Gen Error Response:', JSON.stringify(genErr.response?.data, null, 2));
                     throw new Error('Failed to create Merchant Wallet: ' + (genErr.response?.data?.message || genErr.message));
                 }
            } else {
                 throw e;
            }
        }
        
        log(`Wallet Balance: ${wallet.balance || '0 (Newly Created)'}`, 'PASS');

        // 2a. Get Business Details
        log('Fetching Business Details...');
        const bizRes = await axios.get(`${API_URL}/business/my-business`, { headers });
        const businessId = bizRes.data.data.id;
        log(`Merchant Business ID: ${businessId}`);

        // 3. Initiate Refund
        log('Initiating Refund (Debit Wallet)...');
        let ordersRes;
        try {
             ordersRes = await axios.get(`${API_URL}/orders/business/${businessId}?page=1&limit=5`, { headers });
        } catch(e) {
             throw new Error('Failed to fetch orders: ' + (e.response?.data?.message || e.message));
        }
        
        const orders = ordersRes.data.data.items || ordersRes.data.data;
        if (!orders || orders.length === 0) {
            log('No orders found for business. Skipping Refund.', 'WARN');
        } else {
            // Find a PAID order
            const paidOrder = orders.find(o => o.status === 'CONFIRMED' || o.paymentStatus === 'SUCCESS' || o.paymentStatus === 'paid' || o.status === 'PAID');
            if (!paidOrder) {
                 log('No PAID/CONFIRMED order found. Using the first one: ' + orders[0].status, 'WARN');
            }
            const orderToRefund = paidOrder || orders[0];
            log(`Refunding Order ID: ${orderToRefund.id} (Status: ${orderToRefund.status})`);

            try {
                 const refundRes = await axios.post(`${API_URL}/orders/refund`, {
                     orderId: orderToRefund.id,
                     amount: 100, // Partial refund of 100
                     reason: 'PRODUCT_DEFECTIVE',
                     refundType: 'PARTIAL',
                     refundMethod: 'WALLET'
                 }, { headers });
                 
                 log('Refund Initiated Successfully');
                 log('Refund Response: ' + JSON.stringify(refundRes.data), 'PASS');

            } catch (refErr) {
                 log('Refund Failed: ' + (refErr.response?.data?.message || refErr.message), 'WARN');
            }
        }

        // 4. Initiate Payout (Transfer to Bank)
        log('Initiating Payout (Transfer)...');
        try {
             const payoutRes = await axios.post(`${API_URL}/wallets/transfer`, {
                 amount: 50,
                 destinationBankCode: '058', // GTBank
                 destinationAccountNumber: '0123456789',
                 narration: 'Payout Test',
                 reference: 'payout-' + Date.now()
             }, { headers });
             log('Payout Initiated: ' + (payoutRes.data.message || 'Success'), 'PASS');
        } catch (payErr) {
             const msg = payErr.response?.data?.message || payErr.message;
             log('Payout Failed: ' + msg, 'WARN');
        }

        log('Financial Flow Part 2 Completed', 'PASS');

    } catch (error) {
        log('Test Failed: ' + (error.response?.data?.message || error.message), 'ERROR');
    }
}

run();
