import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entity/user.entity';
import { PaymentProvider, WalletStatus } from '../../../common/enums/payment.enum';

/**
 * Wallet Entity - Virtual account for receiving payments
 *
 * Purpose:
 * - Each user gets a dedicated virtual account (DVA)
 * - Customers can fund wallet via bank transfer
 * - Wallet used for order payments, refunds
 * - NOT for business payment splits (see BusinessPaymentAccount)
 *
 * Provider-agnostic design:
 * - Works with Paystack DVA or other providers
 * - Provider-specific fields stored in providerMetadata JSON
 */
@Entity('wallets')
@Index(['userId'], { unique: true })
@Index(['accountNumber'], { unique: true })
@Index(['status'])
@Index(['providerCustomerId'])
export class Wallet {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Owner user ID (unique - one wallet per user)
   */
  @Column({ unique: true })
  userId: number;

  @OneToOne(() => User, (user) => user.wallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /**
   * Payment provider managing this wallet
   * PAYSTACK: Paystack Dedicated Virtual Account
   * (Future: FLUTTERWAVE, SQUAD, etc.)
   */
  @Column({
    type: 'enum',
    enum: PaymentProvider,
    default: PaymentProvider.PAYSTACK,
  })
  provider: PaymentProvider;

  /**
   * Provider's customer ID
   * Paystack: customer_code (CUS_xxxxx)
   */
  @Column({ length: 255, nullable: true })
  providerCustomerId: string;

  /**
   * Provider's virtual account ID
   * Paystack: dedicated_account_id
   */
  @Column({ length: 255, nullable: true })
  providerAccountId: string;

  /**
   * Virtual account number (10 digits for Nigerian banks)
   */
  @Column({ length: 20, unique: true })
  accountNumber: string;

  /**
   * Account name (usually user's full name)
   */
  @Column({ length: 255 })
  accountName: string;

  /**
   * Bank name providing the virtual account
   * Paystack: WEMA BANK, TITAN PAYSTACK
   */
  @Column({ length: 100 })
  bankName: string;

  /**
   * Bank code (Nigeria: 3-digit CBN code)
   */
  @Column({ length: 10 })
  bankCode: string;

  /**
   * Wallet status
   * PENDING: Account creation in progress (Paystack DVA async)
   * ACTIVE: Ready to receive payments
   * INACTIVE: Temporarily disabled
   * SUSPENDED: Blocked due to violation
   */
  @Column({
    type: 'enum',
    enum: WalletStatus,
    default: WalletStatus.PENDING,
  })
  status: WalletStatus;

  /**
   * Available balance (calculated from transactions)
   * Materialized field for performance
   * Updated via database trigger or service layer
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0.00 })
  availableBalance: number;

  /**
   * Pending balance (funds in escrow, unconfirmed)
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0.00 })
  pendingBalance: number;

  /**
   * Ledger balance (total = available + pending)
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0.00 })
  ledgerBalance: number;

  /**
   * Currency code (ISO 4217)
   * Default: NGN (Nigerian Naira)
   */
  @Column({ length: 3, default: 'NGN' })
  currency: string;

  /**
   * Provider-specific metadata (JSON)
   * Store raw API response, extra fields
   */
  @Column({ type: 'jsonb', nullable: true })
  providerMetadata: any;

  /**
   * Wallet activation date
   */
  @Column({ type: 'timestamp', nullable: true })
  activatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
