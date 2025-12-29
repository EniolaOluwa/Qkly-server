import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Business } from '../business.entity';
import { BankAccount } from '../../bank-accounts/entities/bank-account.entity';
import { PaymentProvider, PaymentAccountStatus } from '../../../common/enums/payment.enum';

/**
 * BusinessPaymentAccount Entity - Payment split configuration
 *
 * Purpose:
 * - Paystack Subaccount for automatic payment splits
 * - When customers pay, Paystack automatically:
 *   - Sends 95% to business subaccount
 *   - Sends 5% to platform account
 * - This is NOT the business owner's personal account
 * - Funds settle to business owner's BankAccount per settlement schedule
 */
@Entity('business_payment_accounts')
@Index(['businessId'], { unique: true })
@Index(['providerSubaccountCode'], { unique: true })
@Index(['status'])
export class BusinessPaymentAccount {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Business ID (unique - one payment account per business)
   */
  @Column({ unique: true })
  businessId: number;

  @OneToOne(() => Business, (business) => business.paymentAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  /**
   * Payment provider (PAYSTACK, future: FLUTTERWAVE, etc.)
   */
  @Column({ default: PaymentProvider.PAYSTACK })
  provider: PaymentProvider;

  /**
   * The subaccount code from Paystack (e.g., ACCT_xxxxxxxxx)
   */
  @Column({ nullable: true })
  providerSubaccountCode: string;

  @Column({ nullable: true })
  accountName: string;

  @Column({ nullable: true })
  bankName: string;

  @Column({ nullable: true })
  accountNumber: string;

  /**
   * Status of the payment account
   * PENDING: Subaccount creation in progress
   * ACTIVE: Ready to receive payments
   * INACTIVE: Temporarily disabled
   * SUSPENDED: Blocked due to violation
   */
  @Column({
    type: 'enum',
    enum: PaymentAccountStatus,
    default: PaymentAccountStatus.PENDING,
  })
  status: PaymentAccountStatus;

  /**
   * Settlement bank account (where funds are sent)
   * Links to BankAccount entity
   */
  @Column({ nullable: true })
  settlementBankAccountId: number;

  @ManyToOne(() => BankAccount, { nullable: true })
  @JoinColumn({ name: 'settlementBankAccountId' })
  settlementBankAccount: BankAccount;

  /**
   * Provider metadata (JSON)
   * Store full subaccount creation response
   */
  @Column({ type: 'jsonb', nullable: true })
  providerMetadata: any;

  /**
   * Activation date
   */
  @Column({ type: 'timestamp', nullable: true })
  activatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
