const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { WalletsService } = require('./dist/core/wallets/wallets.service');
const { UsersService } = require('./dist/core/users/users.service');
const { BusinessesService } = require('./dist/core/businesses/businesses.service');
const { DataSource } = require('typeorm'); // Import DataSource
const { generateRandomEmail } = require('./dist/common/utils');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const walletsService = app.get(WalletsService);
  const usersService = app.get(UsersService);
  const businessesService = app.get(BusinessesService);
  const dataSource = app.get(DataSource); // Use Class Token

  try {
    console.log('--- Starting Subaccount Onboarding Verification ---');

    console.log('Ensuring DB Schema is synced (handled by migrations)...');
    
    // 1. Create a Test User & Business
    const testEmail = `test-merchant-${Date.now()}@example.com`;
    // Register User
    const randomPhone = `080${Math.floor(10000000 + Math.random() * 90000000)}`;
    const regResponse = await usersService.registerUser({
      email: testEmail,
      password: 'Password@123',
      firstname: 'Test',
      lastname: 'Merchant',
      phone: randomPhone,
      role: 'BUSINESS' // Ensure ID maps to BUSINESS role
    });
    
    // Extract user ID from response
    const userId = regResponse.userId;
    if (!userId) {
        console.error('Registration Response:', regResponse);
        throw new Error('User registration failed or did not return userId');
    }

    console.log(`Created User: ${userId} (${testEmail})`);

    // Manually verify phone number to bypass business creation restriction
    await dataSource.query(
        `UPDATE "user_profiles" SET "isPhoneVerified" = true WHERE "userId" = $1`,
        [userId]
    );
    console.log('Manually verified user phone number.');

    // Create Business Profile manually (usually done via onboarding)
    const business = await businessesService.createBusiness({
        businessName: 'Test Merchant Store',
        businessTypeId: 1,
        businessDescription: 'A test merchant store',
        location: 'Lagos, Nigeria',
        logo: {
            buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'),
            originalname: 'logo.png',
            mimetype: 'image/png'
        }
    }, userId);
    console.log(`Created Business: ${business.id}`);

    // 2. Generate Wallet with Bank Details
    // This should trigger the Subaccount Creation Flow
    console.log('Generating Wallet with Bank Details...');
    const wallet = await walletsService.generateWallet(userId, {
        walletName: 'Main Wallet',
        bvn: '22222222222',
        dateOfBirth: '1990-01-01',
        bankDetails: {
            accountNumber: '0000000000', // Test Account
            bankCode: '057' // Zenith Bank
        }
    });

    console.log('Wallet Generated:', wallet);

    // 3. Verify BusinessPaymentAccount has Subaccount Code
    console.log('Verifying Business Payment Account...');
    const updatedBusiness = await dataSource.getRepository('Business').findOne({
        where: { id: business.id },
        relations: ['paymentAccount']
    });

    if (updatedBusiness.paymentAccount && updatedBusiness.paymentAccount.providerSubaccountCode) {
        console.log('SUCCESS: Subaccount Code found:', updatedBusiness.paymentAccount.providerSubaccountCode);
        console.log('SUCCESS: Account Name:', updatedBusiness.paymentAccount.accountName);
    } else {
        console.error('FAILURE: Subaccount Code NOT found on Business Profile');
    }

  } catch (error) {
    console.error('Verification Failed:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
