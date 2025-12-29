
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const API_URL = 'http://localhost:4000/v1';

async function runTest() {
  console.log('Starting Order Creation Test...');
  
  try {
    // 1. Get Products to find suitable items
    console.log('Fetching products...');
    const productsRes = await axios.get(`${API_URL}/products?limit=50`);
    if (productsRes.data.data && typeof productsRes.data.data === 'object' && !Array.isArray(productsRes.data.data)) {
        console.log('Inner Data Keys:', Object.keys(productsRes.data.data));
    }
    
    // Attempt to find the array
    let products = [];
    if (Array.isArray(productsRes.data)) products = productsRes.data;
    else if (Array.isArray(productsRes.data.data)) products = productsRes.data.data;
    else if (productsRes.data.data && Array.isArray(productsRes.data.data.data)) products = productsRes.data.data.data; // Nested data.data
    else if (productsRes.data.data && Array.isArray(productsRes.data.data.items)) products = productsRes.data.data.items;
    
    console.log('Resolved Products Array Length:', products ? products.length : 'null');


    
    // Check if products exist
    if (!products || products.length === 0) {
        console.error('No products found in the database. Please seed data first.');
        return;
    }

    const productWithVar = products.find(p => p.hasVariation);
    const productNoVar = products.find(p => !p.hasVariation);

    if (!productWithVar) console.warn('No product with variation found. Skipping variant test.');
    if (!productNoVar) console.warn('No simple product found. Skipping simple test.');

    // --- SCENARIO 1: SUCCESS (Product with Variation) ---
    if (productWithVar) {
      console.log(`\n--- SCENARIO 1: Success Flow (Product: ${productWithVar.name}) ---`);
      const sessionId = uuidv4();
      console.log(`Session ID: ${sessionId}`);

      // Get Variants
      const productDetail = await axios.get(`${API_URL}/products/${productWithVar.id}`);
      let variant = productDetail.data.variants ? productDetail.data.variants[0] : null;
      
      let targetProductId = productWithVar.id;
      let targetVariantId = variant ? variant.id : null;

      if (!variant && productNoVar) {
          console.warn('Product has hasVariation=true but no variants. Falling back to simple product for SUCCESS test.');
          targetProductId = productNoVar.id;
          targetVariantId = null;
      } else if (!variant) {
           console.warn('No suitable product found for success test.');
           return;
      }

      // Add to Cart
      console.log(`Adding to cart: Product ${targetProductId}, Variant ${targetVariantId}`);
      try {
          await axios.post(`${API_URL}/cart/items`, {
              productId: targetProductId,
              variantId: targetVariantId,
              quantity: 1
          }, { headers: { 'x-session-id': sessionId } });
      } catch (e) {
            console.error('Failed to add to cart:', e.message, e.response?.data);
            throw e;
        }

        // Create Order
        console.log('Creating order...');
        // Determine correct business ID
        let activeProduct = productWithVar;
        if (targetProductId === productNoVar?.id) activeProduct = productNoVar;

        const orderPayload = {
            businessId: activeProduct.businessId || 1, 
            customerName: 'Test User',
            customerEmail: 'test@example.com',
            customerPhoneNumber: '08123456789',
            deliveryAddress: '123 Test St, Lagos',
            state: 'Lagos',
            city: 'Ikeja',
            city: 'Ikeja',
            paymentMethod: 'card', 
            deliveryMethod: 'pickup'
        };
        
        const orderRes = await axios.post(`${API_URL}/orders/cart`, orderPayload, {
            headers: { 'x-session-id': sessionId }
        });
        
        const order = orderRes.data;
        console.log(`Order Created: #${order.orderReference} (ID: ${order.id})`);

        // Initialize Payment
        console.log('Initializing Payment...');
        try {
            const paymentRes = await axios.post(`${API_URL}/orders/payment/initialize`, {
                orderId: order.id,
                paymentMethod: 'CARD',
                redirectUrl: 'https://example.com/callback'
            });
            
            console.log('Payment Link Generation Successful!');
            // Log deep object
            console.log('Authorization URL:', paymentRes.data.data.authorizationUrl);
        } catch (payErr) {
            console.error('Payment Init Failed:', payErr.message, payErr.response?.data);
        }
      }


    // --- SCENARIO 2: FAILURE (Product without Variation or just generic fail) ---
    const failProduct = productNoVar || productWithVar;
    
    if (failProduct) {
      console.log(`\n--- SCENARIO 2: Failure Flow (Product: ${failProduct.name}) ---`);
      const sessionId = uuidv4();
      
      // Add to Cart
      console.log(`Adding to cart...`);
      let addPayload = {
        productId: failProduct.id,
        quantity: 1,
      };

      if (failProduct.hasVariation) {
         const d = await axios.get(`${API_URL}/products/${failProduct.id}`);
         if (d.data.variants && d.data.variants[0]) {
             addPayload.variantId = d.data.variants[0].id;
         }
      }

      await axios.post(`${API_URL}/cart/items`, addPayload, { headers: { 'x-session-id': sessionId } });
      
      // Create Order (INVALID PAYLOAD)
      console.log('Attempting to create order with MISSING ADDRESS...');
      const invalidOrderPayload = {
        businessId: failProduct.businessId || 1,
        customerName: 'Fail User',
        customerEmail: 'fail@example.com',
        customerPhoneNumber: '08123456789',
        // deliveryAddress: MISSING
        state: 'Lagos',
        paymentMethod: 'card', 
        deliveryMethod: 'pickup'
      };

      try {
        await axios.post(`${API_URL}/orders/cart`, invalidOrderPayload, {
          headers: { 'x-session-id': sessionId }
        });
        console.error('FAILED: Order was created unexpectedly!');
      } catch (error) {
        if (error.response && error.response.status === 400) {
          console.log('SUCCESS: Order creation failed as expected with 400 Bad Request.');
          console.log('Error Message:', JSON.stringify(error.response.data.message));
        } else {
          console.error('FAILED: Unexpected error:', error.message);
        }
      }
    }

  } catch (err) {
    console.error('Test Script Error:', err.message);
    if(err.response) console.error('API Response:', JSON.stringify(err.response.data, null, 2));
  }
}

runTest();
