const axios = require('axios');
const API_URL = 'http://localhost:4000/v1'; // Corrected port and prefix
const EMAIL = 'john.doe@example.com'; 
const PASSWORD = 'securePassword123';
const DEVICE_ID = 'ios_device_67890';

async function log(message, type = 'INFO') {
    console.log(`[${type}] ${message}`);
}

async function run() {
    try {
        log('--- FINANCIAL FLOW TEST: PART 1 (Setup & Payment) ---');

        // 0. Get Valid Business ID (from Seed Merchant)
        log('Fetching valid Business ID...');
        let businessId = 1;
        try {
             // Login as Seed Merchant
             const seedLogin = await axios.post(`${API_URL}/users/login`, {
                 email: 'merchant1@test.com',
                 password: 'Test@123'
             });
             const seedToken = seedLogin.data.data.accessToken;
             const bizRes = await axios.get(`${API_URL}/business/my-business`, {
                 headers: { Authorization: `Bearer ${seedToken}` }
             });
             businessId = bizRes.data.data.id;
             log(`Using Business ID: ${businessId}`);
        } catch (bizErr) {
            log('Failed to fetch valid business ID. defaulting to 1. Error: ' + bizErr.message, 'WARN');
        }

        // 1. Login as Buyer (John Doe)
        log('Logging in as Buyer...');
        let loginRes;
        try {
            loginRes = await axios.post(`${API_URL}/users/login`, {
                email: EMAIL,
                password: PASSWORD,
                deviceid: DEVICE_ID
            });
        } catch (e) {
            log('Login failed (' + e.message + '). Attempting Registration...');
             // If login fails, register
             const regData = {
                email: EMAIL,
                password: PASSWORD,
                firstname: 'Test',
                lastname: 'Merchant',
                phone: '+2348000000002', // Unique phone
                deviceid: 'test-device'
            };
            try {
                const regRes = await axios.post(`${API_URL}/users/register`, regData);
                loginRes = { data: { data: regRes.data } }; // Mock login structure
                log('Registration success');
            } catch (regError) {
                 log('Registration failed: ' + regError.message, 'ERROR');
                 // If 409, maybe user exists but password mismatch? Try to continue with assumed token if possible or fail.
                 // Actually if login failed and reg failed (409), it means wrong password.
                 // Let's assume correct credentials or fail.
                 throw new Error('Login/Registration failed');
            }
        }
        
        const token = loginRes.data.data.accessToken;
        const headers = { Authorization: `Bearer ${token}` };
        log('Login successful');

        // 2. Check/Generate DVA
        log('Checking Wallet (DVA)...');
        let wallet;
        try {
            const walletRes = await axios.get(`${API_URL}/wallets`, { headers });
            wallet = walletRes.data.data || walletRes.data; 
            log('Wallet found: ' + wallet.accountNumber);
        } catch (e) {
            if (e.response?.status === 404) {
                 log('Wallet not found. Creating DVA...');
                 // Generate Wallet
                 // Note: Needs BVN. Using a dummy BVN for test env
                 try {
                     const genRes = await axios.post(`${API_URL}/wallets/generate`, {
                         walletName: 'Test Merchant Wallet',
                         customerEmail: EMAIL,
                         bvn: '22222222222',
                         dateOfBirth: '1990-01-01',
                         customerName: 'Test Merchant'
                     }, { headers });
                     wallet = genRes.data;
                     log('DVA Created: ' + wallet.accountNumber);
                 } catch (genError) {
                     log('DVA Creation Failed: ' + genError.response?.data?.message || genError.message, 'ERROR');
                     throw genError;
                 }
            } else {
                throw e;
            }
        }

        // 3. Create Order via Cart (Direct creation not supported)
        log('Creating Order via Cart...');
        let orderId;
        
        try {
            // A. Add to Cart
            const sessionId = 'test-session-' + Date.now();
            const cartHeaders = { 'x-session-id': sessionId }; 
            // Note: Product ID 1 must exist.
            await axios.post(`${API_URL}/cart/items`, {
                productId: 1,
                quantity: 1
            }, { headers: cartHeaders });
            
            // B. Create Order from Cart
            const createOrderDto = {
                paymentMethod: 'card',
                deliveryMethod: 'pickup', // Required by DTO
                deliveryAddress: '123 Test St',
                state: 'Lagos',
                customerName: 'Test Merchant',
                customerEmail: EMAIL,
                customerPhoneNumber: '+2348000000002',
                businessId: businessId // Use dynamic ID
            };
            
            // We need to fetch a valid businessId? 
            // Let's assume Business 1 or 2 exists. The products in cart belong to a business.
            // If we use Product 1, likely Business 1 or 2.
            // Let's try businessId: 1 first.
            // createOrderDto.businessId = 1; // Removed hardcode

            const orderRes = await axios.post(`${API_URL}/orders/cart`, createOrderDto, { 
                headers: { ...headers, ...cartHeaders } 
            });
            
            orderId = orderRes.data.id || orderRes.data.data.id;
            log('Order Created! ID: ' + orderId);
            
            // 4. Initiate Payment
            log('Initiating Payment...');
            const paymentRes = await axios.post(`${API_URL}/orders/payment/initialize`, {
                orderId: orderId,
                redirectUrl: 'https://example.com/callback',
                paymentMethod: 'card'
            }, { headers });
            
            const authUrl = paymentRes.data.authorizationUrl || paymentRes.data.data.authorizationUrl;
            log('✓ Payment Initialized!', 'PASS');
            console.log('\n===================================================');
            console.log('ACTION REQUIRED: OPEN THIS URL TO PAY');
            console.log(authUrl);
            console.log('===================================================\n');
            console.log('After paying, run: node src/financial-flow-part2.js');

        } catch (e) {
            log('Order/Payment Failed: ' + (e.response?.data?.message || e.message), 'ERROR');
            if (e.response?.data) console.log(JSON.stringify(e.response.data));
        }

    } catch (error) {
        log('Test Failed: ' + (error.response?.data?.message || error.message), 'ERROR');
        console.error(error);
    }
}

run();
