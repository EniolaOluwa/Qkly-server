import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { User } from '../users/entity/user.entity';
import { PaystackProvider } from './providers/paystack.provider';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class PaystackPollingService {
  private readonly logger = new Logger(PaystackPollingService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly paystackProvider: PaystackProvider,
  ) {}

  /**
   * Poll for pending DVA accounts
   * Run this as a cron job every 5 minutes
   */
  @Cron('*/5 * * * *') // Every 5 minutes
  async pollPendingAccounts(): Promise<void> {
    try {
      const pendingUsers = await this.userRepository.find({
        where: {
          paymentProvider: 'PAYSTACK',
          paystackAccountStatus: 'PENDING',
        },
        take: 50, // Process 50 at a time
      });

      if (pendingUsers.length === 0) {
        return;
      }

      this.logger.log(`[POLLING] Found ${pendingUsers.length} pending accounts`);

      for (const user of pendingUsers) {
        try {
          await this.checkAndUpdateAccount(user);
          // Add small delay to avoid rate limiting
          await this.delay(200);
        } catch (error) {
          this.logger.error(`Failed to poll account for user ${user.id}:`, error);
        }
      }
    } catch (error) {
      this.logger.error('[POLLING ERROR]', error);
    }
  }

  private async checkAndUpdateAccount(user: User): Promise<void> {
    if (!user.paystackCustomerCode) {
      this.logger.warn(`User ${user.id} has no customer code`);
      return;
    }

    try {
      // Fetch DVA from Paystack
      const response = await firstValueFrom(
        this.paystackProvider.httpService.get(
          `${this.paystackProvider.baseUrl}/dedicated_account?customer=${user.paystackCustomerCode}`,
          { headers: this.paystackProvider.getHeaders() },
        ),
      );

      const accounts = response.data.data;

      if (!accounts || accounts.length === 0) {
        return;
      }

      const account = accounts[0];

      if (account.account_number) {
        // Update user with account details
        await this.userRepository.update(user.id, {
          walletAccountNumber: account.account_number,
          walletAccountName: account.account_name,
          walletBankName: account.bank.name,
          paystackDedicatedAccountId: account.id.toString(),
          paystackAccountStatus: 'ACTIVE',
        });

        this.logger.log(`[POLLING SUCCESS] User ${user.id} account activated`);
      }
    } catch (error) {
      this.logger.error(`Error checking account for user ${user.id}:`, error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
