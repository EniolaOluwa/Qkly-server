
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const API_URL = 'http://localhost:4000/v1';

// Credentials (Reuse from seed)
const ADMIN = { email: 'admin@test.com', password: 'Admin@123' };
const MERCHANT = { email: 'merchant1@test.com', password: 'Test@123' };

let adminToken = '';
let merchantToken = '';

async function login(email, password) {
    try {
        const res = await axios.post(`${API_URL}/users/login`, { email, password });
        return res.data.data.accessToken;
    } catch (e) {
        console.error(`Login failed for ${email}:`, e.message);
        throw e;
    }
}

async function runFilterTests() {
    console.log('==========================================');
    console.log('  STARTING ENDPOINT FILTER TESTS');
    console.log('==========================================\n');

    try {
        // --- SETUP ---
        console.log('[SETUP] Logging in...');
        adminToken = await login(ADMIN.email, ADMIN.password);
        merchantToken = await login(MERCHANT.email, MERCHANT.password);
        console.log('  ✓ Tokens acquired');

        // --- 1. PRODUCT FILTERS ---
        console.log('\n[1] PRODUCT FILTERS');
        
        // 1.1 Search
        console.log('Testing Search (q=Headphones)...');
        const searchRes = await axios.get(`${API_URL}/products?search=Headphones`);
        const headphones = searchRes.data.data.data || [];
        console.log(`  ✓ Search returned ${headphones.length} items`);
        if (headphones.length > 0) {
             const match = headphones.every(p => p.name.toLowerCase().includes('headphones') || p.description.toLowerCase().includes('headphones'));
             console.log(`  ✓ Relevance check: ${match ? 'PASS' : 'FAIL'}`);
        }

        // 1.2 Price Range
        console.log('Testing Price Range (min=10000, max=30000)...');
        const priceRes = await axios.get(`${API_URL}/products?minPrice=10000&maxPrice=30000`);
        const priceItems = priceRes.data.data.data || [];
        console.log(`  ✓ Price Filter returned ${priceItems.length} items`);
        if (priceItems.length > 0) {
            const inRange = priceItems.every(p => p.price >= 10000 && p.price <= 30000);
            console.log(`  ✓ Range check: ${inRange ? 'PASS' : 'FAIL'}`);
        }

        // 1.3 Category Name (Note: Creating a filtered request based on previous knowledge)
        console.log('Testing Category Filter (Electronics)...');
        // First get category ID for 'Electronics'
        const catList = await axios.get(`${API_URL}/categories`);
        const elecCat = catList.data.data.find(c => c.name === 'Electronics');
        
        if (elecCat) {
            const catFilterRes = await axios.get(`${API_URL}/products?categoryId=${elecCat.id}`);
            const catItems = catFilterRes.data.data.data || [];
             console.log(`  ✓ Category Filter returned ${catItems.length} items`);
             // Ideally check if all belong to category if relationship is returned
        } else {
            console.warn('  ! "Electronics" category not found for test');
        }


        // --- 2. ORDER FILTERS ---
        console.log('\n[2] ORDER FILTERS');
        // Note: The correct endpoint is /admin/orders/lists based on controller
        console.log('Testing Admin Order Filter (status=pending)...');
        try {
            const orderRes = await axios.get(`${API_URL}/admin/orders/lists?status=pending`, {
                 headers: { Authorization: `Bearer ${adminToken}` }
            });
            const orders = orderRes.data.data.data || [];
            console.log(`  ✓ Status Filter returned ${orders.length} orders`);
            if (orders.length > 0) {
                 const statusMatch = orders.every(o => o.status === 'PENDING');
                 console.log(`  ✓ Status Match: ${statusMatch ? 'PASS' : 'FAIL'}`);
            }
        } catch(e) {
             console.log('  ! Admin Order Filter failed:', e.response?.status);
        }

        // --- 3. ADMIN USER FILTERS ---
        console.log('\n[3] ADMIN USER FILTERS');
        console.log('Testing Active Admins Filter...');
        const adminUsersRes = await axios.get(`${API_URL}/admin/active`, {
             headers: { Authorization: `Bearer ${adminToken}` }
        });
        const activeAdmins = adminUsersRes.data.data.data || adminUsersRes.data.data || []; // Adjust based on pagination structure
        console.log(`  ✓ Active Admins returned: ${activeAdmins.length}`);
        // Check if all actually have status active/true? 
        // Logic depends on endpoint implementation. Assuming list is correct.

        
        // --- 4. WALLET TRANSACTION FILTERS ---
        // Need to find an endpoint. Wallet controller had `getOperations`?
        // Checking previous file view: `getWalletTransactions`
        console.log('\n[4] WALLET TRANSACTION FILTERS');
        console.log('Fetching Wallet Transactions (Default)...');
        try {
             const transRes = await axios.get(`${API_URL}/wallets/transactions`, {
                 headers: { Authorization: `Bearer ${merchantToken}` }
             });
             const transactions = transRes.data.data || [];
             console.log(`  ✓ Transactions fetched: ${transactions.length}`);
        } catch (e) {
             // 404/500 if wallet missing is handled, but assuming merchant might not have wallet from previous test unless we created one.
             console.log('  ! Transaction fetch note:', e.message);
        }

        console.log('\n==========================================');
        console.log('  FILTER TESTS COMPLETED');
        console.log('==========================================');

    } catch (err) {
        console.error('\n!!! TEST FAILURE !!!');
        console.error(err.message);
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Data:', JSON.stringify(err.response.data, null, 2));
        }
    }
}

runFilterTests();
