
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { WalletsService } from '../src/core/wallets/wallets.service';
// import { TransactionRepository } from '../src/core/transaction/transaction.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Transaction } from '../src/core/transaction/entity/transaction.entity';
import { BankAccountsService } from '../src/core/bank-accounts/bank-accounts.service';
import { v4 as uuidv4 } from 'uuid';

async function runDirectTest() {
  console.log('Initializing Nest Application Context...');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });

  try {
    const walletsService = app.get(WalletsService);
    const bankAccountsService = app.get(BankAccountsService);
    const transactionRepo = app.get(getRepositoryToken(Transaction));

    console.log('Services initialized.');

    // 1. Setup Data - Find a user with a bank account (or create dummy logic if needed, but easier to use existing)
    // We need a valid account number in DB.
    // Let's create a bank account specifically for this test to be robust.
    const userId = 2; // Merchant 1 usually
    const accountNumber = `99${Date.now().toString().substring(0, 8)}`; // Random

    console.log(`Adding test bank account: ${accountNumber} for User ${userId}`);
    await bankAccountsService.addBankAccount(userId, accountNumber, '057', 'NGN');

    // 2. Simulate Webhook
    const paystackRef = `TRF_DIRECT_${uuidv4().substring(0, 8)}`;
    const payload = {
      event: 'transfer.success',
      data: {
        reference: paystackRef,
        amount: 50000,
        currency: 'NGN',
        recipient: {
          details: {
            account_number: accountNumber,
            bank_code: '057'
          }
        },
        status: 'success'
      }
    };

    console.log(`Processing Webhook with Ref: ${paystackRef}...`);
    await walletsService.processWebhook(payload);

    // 3. Verify
    const txn = await transactionRepo.findOne({ where: { reference: paystackRef } });

    if (txn) {
      console.log('SUCCESS: Transaction created via webhook!');
      console.log(`ID: ${txn.id}, Status: ${txn.status}, Source: ${txn.metadata?.source}`);
      if (txn.metadata?.source === 'AUTO_SETTLEMENT') {
        console.log('VERIFICATION PASSED: Metadata matched.');
      } else {
        console.error('VERIFICATION FAILED: Metadata mismatch.');
      }
    } else {
      console.error('FAILURE: Transaction not found in DB.');
    }

  } catch (error: any) {
    console.error('Test Failed:', error.message);
    console.error(error.stack);
  } finally {
    await app.close();
  }
}

runDirectTest();
