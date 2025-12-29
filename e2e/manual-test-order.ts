
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const API_URL = 'http://localhost:4000';

async function runTest() {
  console.log('Starting Order Creation Test...');

  try {
    // 1. Get Products to find suitable items
    console.log('Fetching products...');
    const productsRes = await axios.get(`${API_URL}/products?limit=50`);
    const products = productsRes.data.data;

    const productWithVar = products.find((p: any) => p.hasVariation);
    const productNoVar = products.find((p: any) => !p.hasVariation);

    if (!productWithVar) console.warn('No product with variation found. Skipping variant test.');
    if (!productNoVar) console.warn('No simple product found. Skipping simple test.');

    // --- SCENARIO 1: SUCCESS (Product with Variation) ---
    if (productWithVar) {
      console.log(`\n--- SCENARIO 1: Success Flow (Product: ${productWithVar.name}) ---`);
      const sessionId = uuidv4();
      console.log(`Session ID: ${sessionId}`);

      // Get Variants
      const productDetail = await axios.get(`${API_URL}/products/${productWithVar.id}`);
      const variant = productDetail.data.variants[0];
      if (!variant) throw new Error('Product has variation flag but no variants found.');

      // Add to Cart
      console.log(`Adding to cart: Product ${productWithVar.id}, Variant ${variant.id}`);
      await axios.post(`${API_URL}/cart/add`, {
        productId: productWithVar.id,
        variantId: variant.id,
        quantity: 1
      }, { headers: { 'x-session-id': sessionId } });

      // Create Order
      console.log('Creating order...');
      const orderPayload = {

        businessId: productWithVar.businessId,
        customerName: 'Test User',
        customerEmail: 'test@example.com',
        customerPhoneNumber: '08123456789',
        deliveryAddress: '123 Test St, Lagos',
        state: 'Lagos',
        city: 'Ikeja',
        paymentMethod: 'CARD', // Enum check
        deliveryMethod: 'STANDARD' // Enum check
      };

      const orderRes = await axios.post(`${API_URL}/orders/cart`, orderPayload, {
        headers: { 'x-session-id': sessionId }
      });

      const order = orderRes.data;
      console.log(`Order Created: #${order.orderReference} (ID: ${order.id})`);

      // Initialize Payment
      console.log('Initializing Payment...');
      const paymentRes = await axios.post(`${API_URL}/orders/payment/initialize`, {
        orderId: order.id,
        paymentMethod: 'CARD',
        redirectUrl: 'https://example.com/callback'
      });

      console.log('Payment Link Generation Successful!');
      console.log('Authorization URL:', paymentRes.data.data.authorizationUrl);
    }

    // --- SCENARIO 2: FAILURE (Product without Variation or just generic fail) ---
    // If productNoVar exists, use it, else reuse valid product but fail payload
    const failProduct = productNoVar || productWithVar;

    if (failProduct) {
      console.log(`\n--- SCENARIO 2: Failure Flow (Product: ${failProduct.name}) ---`);
      const sessionId = uuidv4();

      // Add to Cart
      console.log(`Adding to cart...`);
      const addPayload = {
        productId: failProduct.id,
        quantity: 1,
        variantId: failProduct.hasVariation ?
          (await axios.get(`${API_URL}/products/${failProduct.id}`)).data.variants[0].id : undefined
      };

      await axios.post(`${API_URL}/cart/add`, addPayload, { headers: { 'x-session-id': sessionId } });

      // Create Order (INVALID PAYLOAD)
      console.log('Attempting to create order with MISSING ADDRESS...');
      const invalidOrderPayload = {
        businessId: failProduct.businessId,
        customerName: 'Fail User',
        customerEmail: 'fail@example.com',
        customerPhoneNumber: '08123456789',
        // deliveryAddress: MISSING
        state: 'Lagos',
        paymentMethod: 'CARD',
        deliveryMethod: 'STANDARD'
      };

      try {
        await axios.post(`${API_URL}/orders/cart`, invalidOrderPayload, {
          headers: { 'x-session-id': sessionId }
        });
        console.error('FAILED: Order was created unexpectedly!');
      } catch (error: any) {
        if (error.response && error.response.status === 400) {
          console.log('SUCCESS: Order creation failed as expected with 400 Bad Request.');
          console.log('Error Message:', JSON.stringify(error.response.data.message));
        } else {
          console.error('FAILED: Unexpected error:', error.message);
        }
      }
    }

  } catch (err: any) {
    console.error('Test Script Error:', err.message);
    if (err.response) console.error('API Response:', err.response.data);
  }
}

runTest();
