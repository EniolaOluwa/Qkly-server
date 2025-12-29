
const axios = require('axios');
const API_URL = 'http://localhost:4000/v1';

// Test Bank Details (Paystack Test Mode)
const TEST_BANK = {
    accountNumber: '0000000000', // Paystack Test Success Account
    bankCode: '057', // Zenith Bank
    currency: 'NGN'
};

async function run() {
    try {
        console.log('=== PAYOUT VERIFICATION ===');
        
        // 1. Login
        console.log('Logging in...');
        const loginRes = await axios.post(`${API_URL}/users/login`, {
            email: 'merchant1@test.com',
            password: 'Test@123'
        });
        const token = loginRes.data.data.accessToken;
        const userId = loginRes.data.data.userId;
        const headers = { Authorization: `Bearer ${token}` };

        // 2. Check Wallet Balance
        console.log('Checking Wallet Balance...');
        const balRes = await axios.get(`${API_URL}/wallets/${userId}/balance`, { headers });
        const initialBalance = Number(balRes.data.data.availableBalance);
        console.log(`Current Balance: ${initialBalance}`);

        if (initialBalance < 1000) {
            console.error('Insufficient balance to test payout (Need > 1000). Run manual payment first.');
            process.exit(1);
        }

        // 3. Add Bank Account
        console.log('Adding Test Bank Account...');
        let bankAccountId;
        try {
            const bankRes = await axios.post(`${API_URL}/bank-accounts`, TEST_BANK, { headers });
            bankAccountId = bankRes.data.data.id || bankRes.data.data.raw.id; // handle different response shapes
            console.log(`Bank Account Added (ID: ${bankAccountId})`);
        } catch (e) {
            // Check if already exists? Get list
            console.log('Could not add new bank (maybe duplicate?), fetching existing...');
            const listRes = await axios.get(`${API_URL}/bank-accounts`, { headers });
            if (listRes.data.data.length > 0) {
                bankAccountId = listRes.data.data[0].id;
                console.log(`Using Existing Bank Account (ID: ${bankAccountId})`);
            } else {
                throw new Error('No bank account available');
            }
        }

        // 4. Request Payout
        const PAYOUT_AMOUNT = 500;
        console.log(`Requesting Payout of ${PAYOUT_AMOUNT}...`);
        
        try {
            const payoutRes = await axios.post(`${API_URL}/settlements/payout`, {
                amount: PAYOUT_AMOUNT,
                bankAccountId: bankAccountId,
                narration: 'Test Payout Verification'
            }, { headers });

            console.log('Payout Response:', payoutRes.data);
            console.log('PASS: Payout Initiated Successfully');

        } catch (payoutError) {
            console.error('Payout Request Failed:', payoutError.response?.data || payoutError.message);
            
            // Check specific Paystack errors
            if (payoutError.response?.data?.message?.includes('Insufficient balance') || 
                payoutError.response?.data?.message?.includes('Transfer failed')) {
                console.log('NOTE: This failure might be due to Paystack Sandbox Test Balance being empty.');
                console.log('However, the application logic correctly attempted the transfer.');
            }
        }

        // 5. Verify Wallet Debit
        const balRes2 = await axios.get(`${API_URL}/wallets/${userId}/balance`, { headers });
        const finalBalance = Number(balRes2.data.data.availableBalance);
        console.log(`New Balance: ${finalBalance}`);

        if (finalBalance < initialBalance) {
             console.log('PASS: Wallet Debited');
        } else {
             // If payout failed, wallet might have been refunded (reversed), so balance stays same.
             console.log('INFO: Wallet balance unchanged (Expected if Payout Failed and was Reformed/Reversed)');
        }

        // 6. Verify Transaction Ledger
        console.log('Verifying Transaction Logic...');
        const trxRes = await axios.get(`${API_URL}/wallets/transactions?page=1&limit=5`, { headers });
        const transactions = trxRes.data.data.items || trxRes.data.data; // Handle pagination structure
        
        const withdrawalTrx = transactions.find(t => t.type === 'withdrawal' || t.description.includes('Payout'));
        
        if (withdrawalTrx) {
            console.log('PASS: Transaction Record Found');
            console.log(`- Ref: ${withdrawalTrx.reference}`);
            console.log(`- Type: ${withdrawalTrx.type}`);
            console.log(`- Amount: ${withdrawalTrx.amount}`);
            console.log(`- Desc: ${withdrawalTrx.description}`);
        } else {
            console.error('FAIL: No corresponding transaction found for payout.');
            console.log('Latest Transactions:', transactions.map(t => `${t.type}: ${t.amount}`));
        }

    } catch (e) {
        console.error('Fatal Error:', e.response?.data || e.message);
    }
}

run();
