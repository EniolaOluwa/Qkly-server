/**
 * Real-World E2E Payment Verification
 * Uses HTTP requests against the running server at localhost:4000
 * 
 * Routes based on controller definitions:
 * - POST /v1/users/register
 * - POST /v1/users/login
 * - POST /v1/business (multipart)
 * - POST /v1/products
 * - POST /v1/cart (with x-session-id header)
 * - POST /v1/orders/cart (create from cart, with x-session-id header)
 * - POST /v1/orders/payment/initialize
 * - GET /v1/orders/:id
 * - PATCH /v1/orders/:id/status
 */
const axios = require('axios');
const FormData = require('form-data');

const API_BASE = 'http://localhost:4000/v1';
let merchantToken = null;
let customerToken = null;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function request(method, path, data = null, token = null, extraHeaders = {}) {
    const headers = { 'Content-Type': 'application/json', ...extraHeaders };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    try {
        const response = await axios({ method, url: `${API_BASE}${path}`, data, headers });
        return response.data;
    } catch (error) {
        const msg = error.response?.data?.message || error.message;
        console.error(`  ❌ [${method.toUpperCase()} ${path}] Failed:`, msg);
        if (error.response?.data) console.error('    Response:', JSON.stringify(error.response.data, null, 2).slice(0, 500));
        throw error;
    }
}

async function bootstrap() {
    console.log('=== REAL-WORLD E2E VERIFICATION (HTTP API) ===');
    console.log(`Target: ${API_BASE}\n`);

    try {
        // 1. Register Merchant
        console.log('[1] Registering Merchant...');
        const merchantEmail = `real-merchant-${Date.now()}@example.com`;
        const merchantPhone = '080' + Math.floor(10000000 + Math.random() * 90000000);
        const merchantRegRes = await request('POST', '/users/register', {
            email: merchantEmail,
            password: 'Password@123',
            firstname: 'E2E',
            lastname: 'Merchant',
            phone: merchantPhone,
            deviceid: 'e2e-test-device-' + Date.now(),
            latitude: 6.5244,
            longitude: 3.3792
        });
        console.log(`  ✓ Registered: ${merchantEmail}`);
        
        // Login as merchant
        const merchantLoginRes = await request('POST', '/users/login', {
            email: merchantEmail,
            password: 'Password@123'
        });
        merchantToken = merchantLoginRes.data?.accessToken || merchantLoginRes.accessToken;
        console.log(`  ✓ Merchant Token obtained`);

        // Phone Verification Required Step
        // First get user profile to get the exact phone number as stored
        console.log('\n[1b] Verifying Phone...');
        let userPhone;
        try {
            const profileRes = await request('GET', '/users/profile', null, merchantToken);
            const profile = profileRes.data || profileRes;
            userPhone = profile.user?.phone || profile.phone;
            console.log(`  User phone from profile: ${userPhone}`);
        } catch (e) {
            userPhone = merchantPhone; // fallback to registered phone
            console.log(`  Using registered phone: ${userPhone}`);
        }

        console.log('  Generating OTP (check server logs for code)...');
        try {
            await request('POST', '/users/generate-phone-otp', { phone: userPhone }, merchantToken);
            console.log('  ✓ OTP Generated - check server terminal for the code');
            
            // For interactive mode, prompt for OTP from readline
            const readline = require('readline');
            const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
            const otp = await new Promise(resolve => rl.question('  Enter OTP from server log: ', answer => {
                rl.close();
                resolve(answer.trim());
            }));
            
            await request('POST', '/users/verify-phone-otp', { phone: userPhone, otp }, merchantToken);
            console.log(`  ✓ Phone verified!`);
        } catch (phoneErr) {
            console.error(`  ❌ Phone verification failed: ${phoneErr.response?.data?.message || phoneErr.message}`);
            throw phoneErr;
        }

        // 2. Create Business (multipart form for logo)
        console.log('\n[2] Creating Business...');
        const form = new FormData();
        form.append('businessName', 'E2E Test Shop');
        form.append('businessTypeId', '1');
        form.append('businessDescription', 'Auto-generated for E2E test');
        form.append('location', 'Lagos');
        // Create a minimal 1x1 PNG for the logo
        const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
        form.append('logo', pngBuffer, { filename: 'logo.png', contentType: 'image/png' });
        
        let business;
        try {
            const bizRes = await axios.post(`${API_BASE}/business`, form, {
                headers: { ...form.getHeaders(), 'Authorization': `Bearer ${merchantToken}` }
            });
            business = bizRes.data.data || bizRes.data;
            console.log(`  ✓ Business ID: ${business.id}`);
        } catch (bizErr) {
            console.error('  ❌ Business creation failed:', bizErr.response?.data?.message || bizErr.message);
            console.error('    Full response:', JSON.stringify(bizErr.response?.data, null, 2));
            throw bizErr;
        }

        // 3. Create Product
        console.log('\n[3] Creating Product...');
        const productRes = await request('POST', '/products', {
            name: 'E2E Test Product',
            description: 'Product for real payment test',
            price: 5000,
            quantityInStock: 100,
            category: 'Test Category',
            businessId: business.id
        }, merchantToken);
        const product = productRes.data || productRes;
        console.log(`  ✓ Product ID: ${product.id}`);

        // 4. Register Customer
        console.log('\n[4] Registering Customer...');
        const customerEmail = `real-buyer-${Date.now()}@example.com`;
        const customerPhone = '081' + Math.floor(10000000 + Math.random() * 90000000);
        await request('POST', '/users/register', {
            email: customerEmail,
            password: 'Password@123',
            firstname: 'Test',
            lastname: 'Buyer',
            phone: customerPhone,
            deviceid: 'e2e-test-device-' + Date.now(),
            latitude: 6.5244,
            longitude: 3.3792
        });
        const customerLoginRes = await request('POST', '/users/login', {
            email: customerEmail,
            password: 'Password@123'
        });
        customerToken = customerLoginRes.data?.accessToken || customerLoginRes.accessToken;
        console.log(`  ✓ Customer ready: ${customerEmail}`);

        // 5. Add to Cart
        console.log('\n[5] Adding to Cart...');
        const sessionId = `sess-${Date.now()}`;
        await request('POST', '/cart/items', {
            productId: product.id,
            quantity: 1
        }, customerToken, { 'x-session-id': sessionId });
        console.log(`  ✓ Added to cart (session: ${sessionId})`);

        // 6. Create Order from Cart
        console.log('\n[6] Creating Order from Cart...');
        const orderRes = await request('POST', '/orders/cart', {
            businessId: business.id,
            customerName: 'Test Buyer',
            customerEmail: customerEmail,
            customerPhoneNumber: customerPhone,
            deliveryAddress: '123 Test Street',
            state: 'Lagos',
            city: 'Ikeja',
            paymentMethod: 'card',
            deliveryMethod: 'standard'
        }, customerToken, { 'x-session-id': sessionId });
        const order = orderRes.data || orderRes;
        console.log(`  ✓ Order ID: ${order.id}, Ref: ${order.orderReference}`);

        // 7. Initialize Payment
        console.log('\n[7] Generating Payment Link...');
        const paymentRes = await request('POST', '/orders/payment/initialize', {
            orderId: order.id,
            paymentMethod: 'card',
            platform: 'web'
        });
        const paymentData = paymentRes.data || paymentRes;
        
        console.log('\n====================================================');
        console.log('  ACTION REQUIRED: Complete payment using link below.');
        console.log('  You have 2 minutes to complete the payment.\n');
        console.log(`  URL: ${paymentData.authorizationUrl}`);
        console.log(`  Reference: ${paymentData.paymentReference}`);
        console.log('====================================================\n');

        // 8. Poll for Payment Verification
        console.log('Polling for payment completion...');
        let paid = false;
        let attempts = 0;
        const MAX_ATTEMPTS = 24; // 2 minutes at 5s intervals
        
        while (!paid && attempts < MAX_ATTEMPTS) {
            await sleep(5000);
            attempts++;
            process.stdout.write('.');
            
            try {
                const verifyRes = await request('GET', `/orders/${order.id}`, null, customerToken);
                const orderStatus = verifyRes.data || verifyRes;
                
                // Check for paid status (could be 'paid', 'PAID', or enum value)
                const paymentStatus = (orderStatus.paymentStatus || '').toLowerCase();
                if (paymentStatus === 'paid') {
                    console.log('\n\n✅ Payment Confirmed!');
                    console.log(`   Order Status: ${orderStatus.status}`);
                    console.log(`   Payment Status: ${orderStatus.paymentStatus}`);
                    paid = true;
                }
            } catch (e) {
                // Continue polling
            }
        }

        if (!paid) {
            console.log('\n\n⚠️ Payment not confirmed within timeout. Check Paystack dashboard.');
            console.log('   The payment link is still valid - you can complete it manually.');
            return;
        }

        // 9. Merchant Fulfillment
        console.log('\n[9] Merchant Updating Order Status...');
        await request('PATCH', `/orders/${order.id}/status`, {
            status: 'shipped'
        }, merchantToken);
        console.log('   ✓ Order marked as shipped');

        // 10. Check Balance (Optional - may require wallet setup)
        console.log('\n[10] Checking Merchant Balance...');
        try {
            const balanceRes = await request('GET', '/wallets/balance', null, merchantToken);
            console.log(`   Balance: ${JSON.stringify(balanceRes.data || balanceRes)}`);
        } catch (e) {
            console.log('   ℹ️ Balance check skipped (wallet may need setup)');
        }

        console.log('\n=== ✅ E2E VERIFICATION COMPLETE ===');

    } catch (error) {
        console.error('\n❌ E2E VERIFICATION FAILED');
    }
}

bootstrap();
