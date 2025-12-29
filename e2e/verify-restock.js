
const axios = require('axios');
const API_URL = 'http://localhost:4000/v1';

async function verifyRestock() {
    try {
        console.log('Logging in...');
        const loginRes = await axios.post(`${API_URL}/users/login`, {
            email: 'merchant1@test.com',
            password: 'Test@123'
        });
        const token = loginRes.data.data.accessToken;
        const headers = { Authorization: `Bearer ${token}` };

        console.log('--- RESTOCK TEST ---');
        // 1. Check current Variant 2 Stock
        const prodRes1 = await axios.get(`${API_URL}/products/1`, { headers });
        const variant = prodRes1.data.data.variants.find(v => v.id === 2);
        console.log(`Current Stock (Variant 2): ${variant.quantityInStock}`);

        // 2. Add 50 units
        console.log('Adding 50 units...');
        await axios.patch(`${API_URL}/products/restock/1`, {
            quantity: 50,
            variantId: 2,
            operation: 'ADD'
        }, { headers });

        // 3. Verify
        const prodRes2 = await axios.get(`${API_URL}/products/1`, { headers });
        const variant2 = prodRes2.data.data.variants.find(v => v.id === 2);
        console.log(`New Stock (Variant 2): ${variant2.quantityInStock}`);
        
        if (variant2.quantityInStock === variant.quantityInStock + 50) {
            console.log('PASS: Stock incremented correctly.');
        } else {
            console.error('FAIL: Stock mismatch.');
        }

    } catch (e) {
        console.error('Error:', e.response?.data || e.message);
    }
}

verifyRestock();
