import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Business } from '../../businesses/business.entity';
import { Order } from '../../order/entity/order.entity';
import { BankAccount } from '../../bank-accounts/entities/bank-account.entity';
import { SettlementStatus } from '../../../common/enums/settlement.enum';

/**
 * Settlement Entity - Business payout records
 *
 * Purpose:
 * - Track when businesses get paid for orders
 * - Calculate platform fees and net payouts
 * - Enable settlement reconciliation
 * - Support scheduled and manual settlements
 *
 * Replaces Order.settlementDetails JSON field
 */
@Entity('settlements')
@Index(['businessId', 'createdAt'])
@Index(['orderId'], { unique: true })
@Index(['settlementReference'], { unique: true })
@Index(['status'])
export class Settlement {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Unique settlement reference
   * Format: STL-XXXXXXXXXX
   */
  @Column({ unique: true, length: 50 })
  settlementReference: string;

  /**
   * Business being settled
   */
  @Column()
  businessId: number;

  @ManyToOne(() => Business, (business) => business.settlements, { nullable: false })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  /**
   * Order ID (one settlement per order)
   */
  @Column({ unique: true })
  orderId: number;

  @OneToOne(() => Order, (order) => order.settlement, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  /**
   * Settlement status
   * PENDING: Awaiting processing
   * PROCESSING: Transfer initiated
   * COMPLETED: Successfully paid out
   * FAILED: Transfer failed
   * CANCELLED: Settlement cancelled
   */
  @Column({
    type: 'enum',
    enum: SettlementStatus,
    default: SettlementStatus.PENDING,
  })
  status: SettlementStatus;

  /**
   * Order total amount (gross revenue)
   */
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  orderAmount: number;

  /**
   * Platform fee (percentage of order amount)
   * Typically 5% (calculated from business.revenueSharePercentage)
   */
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  platformFee: number;

  /**
   * Payment gateway fee (Paystack, etc.)
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0.00 })
  gatewayFee: number;

  /**
   * Net settlement amount to business
   * = orderAmount - platformFee - gatewayFee
   */
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  settlementAmount: number;

  /**
   * Currency code
   */
  @Column({ length: 3, default: 'NGN' })
  currency: string;

  /**
   * Destination bank account
   */
  @Column({ nullable: true })
  bankAccountId: number;

  @ManyToOne(() => BankAccount, { nullable: true })
  @JoinColumn({ name: 'bankAccountId' })
  bankAccount: BankAccount;

  /**
   * Transfer provider (PAYSTACK, etc.)
   */
  @Column({ length: 50, nullable: true })
  transferProvider: string;

  /**
   * Provider's transfer reference
   */
  @Column({ length: 255, nullable: true })
  transferReference: string;

  /**
   * Provider metadata (JSON)
   * Store transfer response for debugging
   */
  @Column({ type: 'jsonb', nullable: true })
  providerMetadata: any;

  /**
   * Settlement date (when business got paid)
   */
  @Column({ type: 'timestamp', nullable: true })
  settledAt: Date;

  /**
   * Failure reason (if status = FAILED)
   */
  @Column({ type: 'text', nullable: true })
  failureReason: string;

  /**
   * Retry count (for failed settlements)
   */
  @Column({ type: 'smallint', default: 0 })
  retryCount: number;

  /**
   * Next retry date (for failed settlements)
   */
  @Column({ type: 'timestamp', nullable: true })
  nextRetryAt: Date;

  /**
   * User who initiated settlement (admin, system)
   */
  @Column({ nullable: true })
  initiatedBy: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
