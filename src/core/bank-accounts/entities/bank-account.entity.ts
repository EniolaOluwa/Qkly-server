import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entity/user.entity';
import { BankAccountStatus } from '../../../common/enums/payment.enum';

/**
 * BankAccount Entity - External bank accounts for withdrawals
 *
 * Purpose:
 * - Users link personal bank accounts for withdrawing funds
 * - Supports multiple accounts (primary + backups)
 * - Verified via Paystack account name validation
 * - Used for: wallet withdrawals, business settlements
 */
@Entity('bank_accounts')
@Index(['userId', 'isPrimary'])
@Index(['accountNumber', 'bankCode'], { unique: true })
@Index(['status'])
export class BankAccount {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Owner user ID (user can have multiple accounts)
   */
  @Column()
  userId: number;

  @ManyToOne(() => User, (user) => user.bankAccounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /**
   * Bank account number (10 digits for Nigerian banks)
   */
  @Column({ length: 20 })
  accountNumber: string;

  /**
   * Account holder name (from bank verification)
   */
  @Column({ length: 255 })
  accountName: string;

  /**
   * Bank name (e.g., "Access Bank", "GTBank")
   */
  @Column({ length: 100 })
  bankName: string;

  /**
   * Bank code (Nigeria: 3-digit CBN code, e.g., "044" for Access)
   */
  @Column({ length: 10 })
  bankCode: string;

  /**
   * Account verification status
   * PENDING: Added but not verified
   * VERIFIED: Paystack confirmed account name matches
   * FAILED: Verification failed (invalid account)
   */
  @Column({
    type: 'enum',
    enum: BankAccountStatus,
    default: BankAccountStatus.PENDING,
  })
  status: BankAccountStatus;

  /**
   * Primary account flag (one per user)
   * Used as default for withdrawals
   */
  @Column({ default: false })
  isPrimary: boolean;

  /**
   * Paystack recipient code (for transfers)
   * Created when account is verified
   */
  @Column({ length: 255, nullable: true })
  providerRecipientCode: string;

  /**
   * Verification provider (PAYSTACK, MANUAL)
   */
  @Column({ length: 50, nullable: true })
  verificationProvider: string;

  /**
   * Verification response (JSON from provider)
   */
  @Column({ type: 'jsonb', nullable: true })
  verificationResponse: any;

  /**
   * Date when account was verified
   */
  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
