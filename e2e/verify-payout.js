const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { WalletsService } = require('./dist/core/wallets/wallets.service');
const { UsersService } = require('./dist/core/users/users.service');
const { BusinessesService } = require('./dist/core/businesses/businesses.service');
const { DataSource } = require('typeorm');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const walletsService = app.get(WalletsService);
  const usersService = app.get(UsersService);
  const businessesService = app.get(BusinessesService);
  const dataSource = app.get(DataSource);

  try {
    console.log('--- Starting Payout & Balance Verification ---');

    // 1. Setup User & Subaccount (Reuse logic)
    const testEmail = `payout-test-${Date.now()}@example.com`;
    const randomPhone = `080${Math.floor(10000000 + Math.random() * 90000000)}`;
    const regResponse = await usersService.registerUser({
      email: testEmail,
      password: 'Password@123',
      firstname: 'Payout',
      lastname: 'Tester',
      phone: randomPhone,
      role: 'BUSINESS'
    });
    const userId = regResponse.userId;
    console.log(`Created User: ${userId}`);

    await dataSource.query(`UPDATE "user_profiles" SET "isPhoneVerified" = true WHERE "userId" = $1`, [userId]);

    const business = await businessesService.createBusiness({
        businessName: 'Payout Test Store',
        businessTypeId: 1,
        businessDescription: 'Testing payouts',
        location: 'Lagos',
        logo: {
            buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'),
            originalname: 'logo.png',
            mimetype: 'image/png'
        }
    }, userId);
    console.log(`Created Business: ${business.id}`);

    // 2. Generate Wallet (Link Subaccount)
    await walletsService.generateWallet(userId, {
        walletName: 'Payout Wallet',
        bvn: '22222222222',
        dateOfBirth: '1990-01-01',
        bankDetails: { accountNumber: '0000000000', bankCode: '057' }
    });
    console.log('Wallet Generated & Subaccount Linked.');

    // 3. Fetch Balance (Expect 0 but successful call)
    console.log('Fetching Wallet Balance (External)...');
    const balanceDto = await walletsService.getUserWalletWithBalance(userId);
    
    console.log('Balance Response:', balanceDto);

    if (balanceDto.availableBalance !== undefined && balanceDto.ledgerBalance !== undefined) {
        console.log('SUCCESS: Balance fetched successfully.');
        if (balanceDto.availableBalance === 0) {
            console.log('SUCCESS: Balance is 0 as expected for new account.');
        } else {
             console.log(`NOTICE: Balance is ${balanceDto.availableBalance} (Non-zero implies funds exist or mock data).`);
        }
    } else {
        console.error('FAILURE: Balance fields missing.');
    }

    // 4. Test Withdrawal
    console.log('--- Testing Withdrawal ---');
    try {
        const payoutResponse = await walletsService.requestPayout(userId, {
            amount: 5000,
            bankAccountId: 999, // Dummy ID, service uses wallet defaults currently
            pin: '1234',
            narration: 'Test Verification Payout'
        });
        console.log('Payout Response:', payoutResponse);
        
        if (payoutResponse.success && payoutResponse.reference) {
            console.log('SUCCESS: Payout initiated.');
        } else {
             console.error('FAILURE: Payout response invalid.');
        }

    } catch (err) {
        console.error('FAILURE: Withdrawal Failed:', err.message);
    }

  } catch (error) {
    console.error('Verification Failed:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
