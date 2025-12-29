
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const API_URL = 'http://localhost:4000/v1';

async function runRetryTest() {
  console.log('Starting Payment Retry Test...');
  
  try {
    // 1. Get Product
    const productsRes = await axios.get(`${API_URL}/products?limit=1`);
    // Adjust data extraction based on previous debug
    let products = [];
    if (productsRes.data.data && Array.isArray(productsRes.data.data.data)) products = productsRes.data.data.data;
    else if (productsRes.data.data && Array.isArray(productsRes.data.data)) products = productsRes.data.data;
    else if (Array.isArray(productsRes.data)) products = productsRes.data;

    const product = products[0];
    if (!product) { console.error('No product found'); return; }

    const sessionId = uuidv4();
    console.log(`Session ID: ${sessionId}`);

    // 2. Add to Cart
    await axios.post(`${API_URL}/cart/items`, {
        productId: product.id,
        quantity: 1
    }, { headers: { 'x-session-id': sessionId } });

    // 3. Create Order
    const orderPayload = {
        businessId: product.businessId || 1, 
        customerName: 'Retry User',
        customerEmail: 'retry@example.com',
        customerPhoneNumber: '08123456789',
        deliveryAddress: 'Retry Lane',
        state: 'Lagos',
        city: 'Ikeja',
        paymentMethod: 'card', 
        deliveryMethod: 'pickup'
    };
    
    const orderRes = await axios.post(`${API_URL}/orders/cart`, orderPayload, { headers: { 'x-session-id': sessionId } });
    console.log('Order Creation Response:', JSON.stringify(orderRes.data, null, 2));
    const order = orderRes.data.data; // Fixed access
    if (!order || !order.id) { console.error('Order creation failed to return ID'); return; }
    console.log(`Order Created: #${order.orderReference} (ID: ${order.id})`);

    // 4. Initialize Payment (Attempt 1)
    const initRes1 = await axios.post(`${API_URL}/orders/payment/initialize`, {
        orderId: order.id,
        paymentMethod: 'card'
    });
    const ref1 = initRes1.data.data.paymentReference;
    console.log(`Attempt 1 Reference: ${ref1}`);

    // 5. Simulate Failure
    // We can't easily trigger a webhook locally without ngrok & provider, but we can try to force status update via DB or internal method if exposed.
    // Alternatively, verifyPayment usually calls provider. 
    // IF we are mocking, we'd need to mock verify.
    // Assuming we can't mock external provider easily here, let's use the `processPayment` endpoint 
    // or direct DB update if possible. But `processPayment` is for manual?
    // Wait, the user has a "test-data.seed.ts"? No.
    // Let's rely on standard endpoints.
    
    // We can simulate failure by calling verify on a non-existent ref IF verify handles that?
    // Actually, `processPayment` endpoint allows "manual" processing. 
    // But we want to simulate "FAILED" state.
    // Let's use `updateOrderStatus` if it allows updating PaymentStatus? Usually restricted.
    
    // HACK for Test: Since we can't easily fake a callback, let's just initialize again 
    // BUT initialize wont retry unless status is FAILED.
    // We need to set status to FAILED.
    // Does the `OrdersController` expose a way to set status?
    // `PATCH /orders/:id/status` -> UpdateOrderStatusDto usually updates `status` (ORDER status) not paymentStatus.
    
    // Idea: We can use `processPayment` to set it to FAILED if allowed?
    // No, `processPayment` usually sets to PAID.
    
    // OK, since we are in a dev environment and I have access to the code, 
    // I can't directly change DB from valid http call easily without a "backdoor".
    // However, I can try to use `verifyPayment` with a reference that the Mock Provider (if exists) returns failed for?
    // Or just manually update SQL? No, I'm running client script.
    
    // Let's assume the user has a way to fail it.
    // Actually, I can use the `command` tool to run a SQL update via typeorm/cli if needed? Overkill.
    
    // Let's try to see if `verifyPayment` returns 'FAILED' for a specific reference pattern?
    // If not, I will just log that I am skipping the manual failure step and testing the logic by assuming it is failed 
    // (This script might fail to trigger retry if status is INITIATED).
    
    // WAIT, I can use `initializePayment` response. 
    // If I call it again immediately, it returns the SAME link (Idempotency).
    // I verify that first.
    console.log('Verifying Idempotency (Should return same ref)...');
    const initRes2 = await axios.post(`${API_URL}/orders/payment/initialize`, {
        orderId: order.id,
        paymentMethod: 'card'
    });
    const ref2 = initRes2.data.data.paymentReference;
    if (ref1 === ref2) console.log('Idempotency Verified: Refs match.');
    else console.warn('Idempotency Failed: Refs differ.');

    // NOW, I need to force it to FAILED to test retry.
    // I'll try to find a hack or just say "Please mark order ID X as FAILED in DB to continue".
    // Or, better, I can create a temporary backdoor controller? No, unsafe.
    
    // Let's just create a `manual-db-update.ts` to set status to FAILED using TypeORM.
    // That's cleaner. 
    console.log(`\n*** ACTION REQUIRED ***`);
    console.log(`Order ${order.id} is currently INITIATED.`);
    console.log(`To test RETRY, we must set its paymentStatus to 'failed'.`);
    console.log(`I will run a helper command to update DB now...`);
    
  } catch (err) {
    console.error('Test Failed:', err.message, err.response?.data);
  }
}

runRetryTest();
