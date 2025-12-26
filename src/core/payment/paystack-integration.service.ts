// src/core/payment/paystack-integration.service.ts
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { Business } from '../businesses/business.entity';
import {
  Transaction,
  TransactionFlow,
  TransactionStatus,
  TransactionType,
} from '../transaction/entity/transaction.entity';
import { User } from '../users/entity/user.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { BusinessPaymentAccount } from '../businesses/entities/business-payment-account.entity';
import { PaystackProvider } from './providers/paystack.provider';
import { ErrorHelper } from '../../common/utils';
import { WalletStatus, PaymentAccountStatus } from '../../common/enums/payment.enum';

@Injectable()
export class PaystackIntegrationService {
  private readonly logger = new Logger(PaystackIntegrationService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(BusinessPaymentAccount)
    private readonly businessPaymentAccountRepository: Repository<BusinessPaymentAccount>,
    private readonly paystackProvider: PaystackProvider,
    private readonly configService: ConfigService,
  ) { }

  // ============================================================
  // BUSINESS ONBOARDING - Create DVA + Subaccount
  // ============================================================

  /**
   * Onboard a business with BOTH DVA and Subaccount
   */
  async onboardBusiness(
    userId: number,
    businessId: number,
  ): Promise<{
    dva: any;
    subaccount: any;
  }> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['profile', 'wallet'],
      });

      if (!user) {
        ErrorHelper.NotFoundException('User not found');
      }

      const business = await this.businessRepository.findOne({
        where: { id: businessId },
        relations: ['paymentAccount'],
      });

      if (!business) {
        ErrorHelper.NotFoundException('Business not found');
      }

      // Step 1: Create DVA for the user (their wallet)
      const dva = await this.createBusinessDVA(user);

      // Step 2: Create Subaccount for the business (for payment splits)
      const subaccount = await this.createBusinessSubaccount(user, business);

      return { dva, subaccount };
    } catch (error) {
      this.logger.error('Failed to onboard business:', error);
      throw error;
    }
  }

  /**
   * Create DVA for business owner (their wallet)
   */
  private async createBusinessDVA(user: User): Promise<any> {
    try {
      // Check if user already has a DVA
      if (user.wallet && user.wallet.status === WalletStatus.ACTIVE) {
        this.logger.log(`User ${user.id} already has active DVA`);
        return await this.paystackProvider.getVirtualAccountDetails(user.wallet.providerCustomerId);
      }

      // Create new DVA
      const dvaResponse = await this.paystackProvider.createVirtualAccount({
        customerName: `${user.profile?.firstName} ${user.profile?.lastName}`,
        customerEmail: user.email,
        walletReference: `USR-${user.id}`,
        firstName: user.profile?.firstName,
        lastName: user.profile?.lastName,
        phoneNumber: user.profile?.phone,
        email: user.email,
      });

      // Create or update Wallet entity
      if (user.wallet) {
        await this.walletRepository.update(user.wallet.id, {
          providerCustomerId: dvaResponse.customerCode,
          providerAccountId: dvaResponse.providerAccountId,
          status: dvaResponse.status === 'active' ? WalletStatus.ACTIVE : WalletStatus.PENDING,
          accountNumber: dvaResponse.accountNumber,
          accountName: dvaResponse.accountName,
          bankName: dvaResponse.bankName,
          bankCode: dvaResponse.bankCode,
          activatedAt: dvaResponse.status === 'active' ? new Date() : undefined,
        });
      } else {
        const wallet = this.walletRepository.create({
          userId: user.id,
          providerCustomerId: dvaResponse.customerCode,
          providerAccountId: dvaResponse.providerAccountId,
          status: dvaResponse.status === 'active' ? WalletStatus.ACTIVE : WalletStatus.PENDING,
          accountNumber: dvaResponse.accountNumber,
          accountName: dvaResponse.accountName,
          bankName: dvaResponse.bankName,
          bankCode: dvaResponse.bankCode,
          activatedAt: dvaResponse.status === 'active' ? new Date() : undefined,
        });
        await this.walletRepository.save(wallet);
      }

      this.logger.log(`DVA created for user ${user.id}`);
      return dvaResponse;
    } catch (error) {
      this.logger.error(`Failed to create DVA for user ${user.id}:`, error);
      throw error;
    }
  }

  /**
   * Create Subaccount for business (for payment splits)
   */
  private async createBusinessSubaccount(user: User, business: Business): Promise<any> {
    try {
      // Check if business already has subaccount
      if (business.paymentAccount && business.paymentAccount.providerSubaccountCode) {
        this.logger.log(`Business ${business.id} already has subaccount`);
        return { subaccount_code: business.paymentAccount.providerSubaccountCode };
      }

      // Ensure user has wallet account (DVA) for settlement
      if (!user.wallet || !user.wallet.accountNumber || !user.wallet.bankCode) {
        ErrorHelper.BadRequestException(
          'User must have a wallet account (DVA) before creating subaccount',
        );
      }

      // Platform fee percentage (e.g., 5%)
      const platformFeePercentage = parseFloat(
        this.configService.get('PLATFORM_FEE_PERCENTAGE', '5'),
      );
      const businessSharePercentage = 100 - platformFeePercentage;

      // Create subaccount on Paystack
      const response = await firstValueFrom(
        this.paystackProvider.httpService.post(
          `${this.paystackProvider.baseUrl}/subaccount`,
          {
            business_name: business.businessName,
            settlement_bank: user.wallet.bankCode, // Settle to DVA
            account_number: user.wallet.accountNumber, // DVA account number
            percentage_charge: businessSharePercentage,
            description: business.businessDescription || `Subaccount for ${business.businessName}`,
            primary_contact_email: user.email,
            primary_contact_name: `${user.profile?.firstName} ${user.profile?.lastName}`,
            primary_contact_phone: user.profile?.phone,
            metadata: {
              businessId: business.id,
              userId: user.id,
            },
          },
          { headers: this.paystackProvider.getHeaders() },
        ),
      );

      const subaccountCode = response.data.data.subaccount_code;

      // Create or update BusinessPaymentAccount entity
      if (business.paymentAccount) {
        await this.businessPaymentAccountRepository.update(business.paymentAccount.id, {
          providerSubaccountCode: subaccountCode,
          status: PaymentAccountStatus.ACTIVE,
          providerMetadata: response.data.data,
          activatedAt: new Date(),
        });
      } else {
        const paymentAccount = this.businessPaymentAccountRepository.create({
          businessId: business.id,
          providerSubaccountCode: subaccountCode,
          status: PaymentAccountStatus.ACTIVE,
          providerMetadata: response.data.data,
          activatedAt: new Date(),
        });
        await this.businessPaymentAccountRepository.save(paymentAccount);
      }

      this.logger.log(`Subaccount created for business ${business.id}: ${subaccountCode}`);
      return response.data.data;
    } catch (error) {
      this.logger.error(`Failed to create subaccount for business ${business.id}:`, error);
      throw error;
    }
  }

  // ============================================================
  // WALLET BALANCE
  // ============================================================

  /**
   * Get business wallet balance from database
   */
  async getBusinessWalletBalance(userId: number): Promise<{
    availableBalance: number;
    ledgerBalance: number;
    currency: string;
  }> {
    try {
      // Calculate balance from transactions
      const result = await this.transactionRepository
        .createQueryBuilder('txn')
        .select('SUM(CASE WHEN txn.flow = :credit THEN txn.netAmount ELSE 0 END)', 'credits')
        .addSelect('SUM(CASE WHEN txn.flow = :debit THEN txn.netAmount ELSE 0 END)', 'debits')
        .where('txn.userId = :userId', { userId })
        .andWhere('txn.status = :status', { status: TransactionStatus.SUCCESS })
        .setParameter('credit', TransactionFlow.CREDIT)
        .setParameter('debit', TransactionFlow.DEBIT)
        .getRawOne();

      const credits = parseFloat(result.credits || '0');
      const debits = parseFloat(result.debits || '0');
      const balance = credits - debits;

      return {
        availableBalance: balance,
        ledgerBalance: balance,
        currency: 'NGN',
      };
    } catch (error) {
      this.logger.error('Failed to get wallet balance:', error);
      throw error;
    }
  }

  // ============================================================
  // TRANSACTION RECORDING
  // ============================================================

  /**
   * Record a transaction
   */
  async recordTransaction(data: {
    userId?: number | null;
    businessId?: number | null;
    orderId?: number;
    type: TransactionType;
    flow: TransactionFlow;
    amount: number;
    fee?: number;
    status: TransactionStatus;
    reference: string;
    providerReference?: string;
    description?: string;
    metadata?: any;
    providerResponse?: any;
  }): Promise<Transaction> {
    try {
      const netAmount = data.amount - (data.fee || 0);

      // Get current balance
      let balanceBefore = 0;
      if (data.userId) {
        const balance = await this.getBusinessWalletBalance(data.userId);
        balanceBefore = balance.availableBalance;
      }

      const balanceAfter =
        data.flow === TransactionFlow.CREDIT
          ? balanceBefore + netAmount
          : balanceBefore - netAmount;

      // Create transaction with proper typing
      const transaction = this.transactionRepository.create({
        userId: data.userId,
        businessId: data.businessId,
        orderId: data.orderId,
        type: data.type,
        flow: data.flow,
        amount: data.amount,
        fee: data.fee || 0,
        netAmount: netAmount,
        status: data.status,
        reference: data.reference,
        providerReference: data.providerReference,
        description: data.description,
        currency: 'NGN',
        paymentProvider: 'PAYSTACK',
        metadata: data.metadata,
        providerResponse: data.providerResponse,
        balanceBefore: balanceBefore,
        balanceAfter: balanceAfter,
        settledAt: data.status === TransactionStatus.SUCCESS ? new Date() : undefined,
      });

      return await this.transactionRepository.save(transaction);
    } catch (error) {
      this.logger.error('Failed to record transaction:', error);
      throw error;
    }
  }
}