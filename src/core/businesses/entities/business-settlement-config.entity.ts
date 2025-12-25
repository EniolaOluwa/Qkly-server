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
import { SettlementSchedule } from '../../../common/enums/settlement.enum';

/**
 * BusinessSettlementConfig Entity - When and how businesses get paid
 *
 * Purpose:
 * - Configure settlement frequency (instant, daily, weekly, monthly)
 * - Set minimum settlement amount (e.g., settle only if > ₦5,000)
 * - Set settlement destination bank account
 * - Track settlement history
 */
@Entity('business_settlement_configs')
@Index(['businessId'], { unique: true })
@Index(['nextSettlementDate'])
export class BusinessSettlementConfig {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Business ID (unique - one config per business)
   */
  @Column({ unique: true })
  businessId: number;

  @OneToOne(() => Business, (business) => business.settlementConfig, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  /**
   * Settlement schedule
   * INSTANT: Settle immediately after order delivery
   * DAILY: Settle once per day (midnight)
   * WEEKLY: Settle every Monday
   * MONTHLY: Settle on 1st of each month
   * MANUAL: Merchant requests settlement manually
   */
  @Column({
    type: 'enum',
    enum: SettlementSchedule,
    default: SettlementSchedule.MANUAL,
  })
  schedule: SettlementSchedule;

  /**
   * Minimum amount to trigger settlement (NGN)
   * If unsettled balance < this amount, skip settlement
   * Default: 1000 (₦1,000)
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 1000.00 })
  minimumSettlementAmount: number;

  /**
   * Default bank account for settlements
   * Links to user's BankAccount
   */
  @Column({ nullable: true })
  defaultBankAccountId: number;

  @ManyToOne(() => BankAccount, { nullable: true })
  @JoinColumn({ name: 'defaultBankAccountId' })
  defaultBankAccount: BankAccount;

  /**
   * Auto-settlement enabled
   * If false, all settlements require manual approval
   */
  @Column({ default: true })
  autoSettlementEnabled: boolean;

  /**
   * Settlement hold period (days)
   * Number of days to hold funds before settling
   * For fraud prevention, chargebacks buffer
   * Default: 0 (immediate after delivery)
   */
  @Column({ type: 'smallint', default: 0 })
  holdPeriodDays: number;

  /**
   * Last settlement date (for DAILY, WEEKLY, MONTHLY schedules)
   */
  @Column({ type: 'timestamp', nullable: true })
  lastSettlementDate: Date;

  /**
   * Next scheduled settlement date
   * Calculated based on schedule
   */
  @Column({ type: 'timestamp', nullable: true })
  nextSettlementDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
