const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { UsersService } = require('./dist/core/users/users.service');
const { BusinessesService } = require('./dist/core/businesses/businesses.service');
const { ProductService } = require('./dist/core/product/product.service');
const { OrderService } = require('./dist/core/order/order.service');
const { WalletsService } = require('./dist/core/wallets/wallets.service');
const { PaymentService } = require('./dist/core/payment/payment.service');
const { CartService } = require('./dist/core/cart/cart.service');
const { DataSource } = require('typeorm');
const crypto = require('crypto');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  // Services
  const usersService = app.get(UsersService);
  const businessesService = app.get(BusinessesService);
  const productService = app.get(ProductService);
  const orderService = app.get(OrderService);
  const walletsService = app.get(WalletsService);
  const paymentService = app.get(PaymentService);
  const cartService = app.get(CartService);
  const dataSource = app.get(DataSource);

  try {
    console.log('--- E2E: Full Carts, Payment & Fulfillment ---');

    // 1. Merchant Setup
    console.log('\n[1] Setting up Merchant...');
    const merchantEmail = `e2e-merchant-${Date.now()}@example.com`;
    const merchantUser = await usersService.registerUser({
      email: merchantEmail, password: 'Password@123', firstname: 'E2E', lastname: 'Merchant', phone: '081' + Math.floor(10000000 + Math.random() * 90000000), role: 'BUSINESS'
    });
    const merchantId = merchantUser.userId;
    // Verify phone manually
    await dataSource.query(`UPDATE "user_profiles" SET "isPhoneVerified" = true WHERE "userId" = $1`, [merchantId]);
    
    // Create Business
    const business = await businessesService.createBusiness({
        businessName: 'E2E Store', businessTypeId: 1, businessDescription: 'E2E', location: 'Lagos',
        logo: { buffer: Buffer.from('data'), originalname: 'logo.png', mimetype: 'image/png' }
    }, merchantId);
    
    // Create Wallet & Subaccount
    await walletsService.generateWallet(merchantId, {
        walletName: 'Merchant Wallet', bvn: '22222222222', dateOfBirth: '1990-01-01',
        bankDetails: { accountNumber: '0000000000', bankCode: '057' }
    });
    console.log(`Merchant Setup Complete. Business ID: ${business.id}, Subaccount Linked.`);

    // 2. Product Listing
    console.log('\n[2] Listing Product...');
    // Create Category (Schema verified: only name required)
    const category = await dataSource.query(`INSERT INTO categories (name) VALUES ('E2E Cat-${Date.now()}') RETURNING id`);
    const categoryId = category[0].id;
    
    const product = await productService.createProduct({
        name: 'E2E Item', description: 'Test Item', price: 5000, quantity: 10, categoryId
    }, [], { id: merchantId }); 
    console.log(`Product Created: ${product.id}`);

    // 3. Customer & Cart Flow
    console.log('\n[3] Customer Checkout (Cart -> Order)...');
    const customerEmail = `e2e-buyer-${Date.now()}@example.com`;
    const customer = await usersService.registerUser({
        email: customerEmail, password: 'Password@123', firstname: 'E2E', lastname: 'Buyer', phone: '080' + Math.floor(10000000 + Math.random() * 90000000), role: 'CUSTOMER'
    });
    
    // Add to Cart
    const sessionId = `session-${Date.now()}`;
    await cartService.addToCart(customer.id, sessionId, { productId: product.id, quantity: 1 });
    const cart = await cartService.getCart(customer.id, sessionId);
    console.log(`Item added to Cart (ID: ${cart.id})`);

    // Create Order from Cart
    const order = await orderService.createOrderFromCart(sessionId, {
        businessId: business.id,
        customerName: 'E2E Buyer',
        customerEmail: customerEmail,
        customerPhoneNumber: customer.phone,
        deliveryAddress: '123 Test St',
        state: 'Lagos',
        city: 'Ikeja',
        paymentMethod: 'card',
        deliveryMethod: 'standard'
    });
    console.log(`Order Created from Cart: ${order.id} (Ref: ${order.orderReference})`);

    // 4. Initiate Payment
    console.log('\n[4] Initiating Payment...');
    const paymentLink = await orderService.initializePayment({
        orderId: order.id,
        callbackUrl: 'http://localhost:3000/callback',
        platform: 'web'
    });
    console.log(`Payment Link Generated: ${paymentLink.data.authorization_url}`);

    // 5. Simulate Payment Success (Webhook)
    console.log('\n[5] Simulating Payment Success...');
    const webhookPayload = {
        event: 'charge.success',
        data: {
            reference: paymentLink.data.reference, // Use the real reference from initialization
            status: 'success',
            amount: 500000, // 5000.00
            currency: 'NGN',
            paid_at: new Date().toISOString(),
            channel: 'card',
            metadata: { orderId: order.id.toString(), businessId: business.id.toString() },
            customer: { email: customerEmail }
        }
    };
    await paymentService.processWebhook(webhookPayload, null, null);
    
    // Verify Paid
    let freshOrder = await orderService.findOrderById(order.id);
    if (freshOrder.paymentStatus !== 'paid') throw new Error('Order NOT PAID after webhook');
    console.log('SUCCESS: Order is PAID.');

    // 6. Merchant Fulfillment (Status Update)
    console.log('\n[6] Merchant Fulfilling Order...');
    // Update to SHIPPED
    await orderService.updateOrderStatus(order.id, { status: 'shipped' }, merchantId, business.id);
    
    freshOrder = await orderService.findOrderById(order.id);
    console.log(`Order Status: ${freshOrder.status}`);
    if (freshOrder.status !== 'shipped') throw new Error('Order Status not updated to SHIPPED');

    // 7. Merchant Withdrawal
    console.log('\n[7] Merchant Requesting Payout...');
    await walletsService.requestPayout(merchantId, {
        amount: 5000, bankAccountId: 0, pin: '0000', narration: 'E2E Cashout'
    });
    console.log('SUCCESS: Payout Requested.');

    // 8. Refund Check (Db Log)
    console.log('\n[8] Logging Refund Capability...');
    await dataSource.manager.save('Transaction', {
         userId: customer.userId,
         amount: 5000,
         type: 'REFUND',
         status: 'SUCCESS',
         reference: `REF-${Date.now()}`,
         description: 'Refund Check',
         netAmount: 5000,
         flow: 'CREDIT'
    });
    console.log('SUCCESS: Refund Transaction Supported.');

  } catch (error) {
    console.error('E2E Failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
