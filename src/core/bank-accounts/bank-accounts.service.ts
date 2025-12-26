import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankAccount } from './entities/bank-account.entity';
import { PaymentService } from '../payment/payment.service';
import { User } from '../users/entity/user.entity';

@Injectable()
export class BankAccountsService {
  private readonly logger = new Logger(BankAccountsService.name);

  constructor(
    @InjectRepository(BankAccount)
    private readonly bankAccountRepository: Repository<BankAccount>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly paymentService: PaymentService,
  ) { }

  /**
   * Add a new bank account for a user
   */
  async addBankAccount(userId: number, accountNumber: string, bankCode: string, currency: string = 'NGN') {
    // 1. Check if account already exists for this user
    const existing = await this.bankAccountRepository.findOne({
      where: {
        userId,
        accountNumber,
        bankCode,
        isDeleted: false,
      },
    });

    if (existing) {
      throw new ConflictException('Bank account already added');
    }

    // 2. Resolve account details with payment provider
    const resolvedAccount = await this.paymentService.resolveBankAccount({
      accountNumber,
      bankCode,
    });

    if (!resolvedAccount) {
      throw new BadRequestException('Could not resolve bank account details');
    }

    // 3. Save bank account
    const bankAccount = this.bankAccountRepository.create({
      userId,
      accountNumber,
      accountName: resolvedAccount.accountName,
      bankCode,
      bankName: await this.getBankName(bankCode),
      currency,
    });

    await this.bankAccountRepository.save(bankAccount);

    this.logger.log(`Bank account added for user ${userId}: ${accountNumber}`);
    return bankAccount;
  }

  /**
   * Get all bank accounts for a user
   */
  async getUserBankAccounts(userId: number) {
    return this.bankAccountRepository.find({
      where: { userId, isDeleted: false },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get a single bank account
   */
  async getBankAccount(id: number, userId: number) {
    const account = await this.bankAccountRepository.findOne({
      where: { id, userId, isDeleted: false },
    });

    if (!account) {
      throw new NotFoundException('Bank account not found');
    }

    return account;
  }

  /**
   * Delete (soft delete) a bank account
   */
  async deleteBankAccount(id: number, userId: number) {
    const account = await this.getBankAccount(id, userId);

    account.isDeleted = true;
    await this.bankAccountRepository.save(account);

    this.logger.log(`Bank account deleted: ${id} for user ${userId}`);
    return { message: 'Bank account deleted successfully' };
  }

  /**
   * Helper to get bank name from code
   */
  private async getBankName(bankCode: string): Promise<string> {
    try {
      const banks = await this.paymentService.getBankList();
      const bank = banks.find((b) => b.code === bankCode);
      return bank ? bank.name : 'Unknown Bank';
    } catch (error) {
      this.logger.warn(`Failed to fetch bank name for code ${bankCode}`, error);
      return 'Unknown Bank';
    }
  }
}
