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
import { Order } from './order.entity';
import { RefundStatus, RefundType, RefundMethod, RefundReason } from '../../../common/enums/order.enum';

/**
 * OrderRefund Entity - Refund information for orders
 *
 * Purpose:
 * - Track refund requests and processing
 * - Support partial and full refunds
 * - Enable refund reconciliation
 * - Audit refund approval workflow
 *
 * Replaces Order.refundDetails JSON field
 */
@Entity('order_refunds')
@Index(['orderId'])
@Index(['refundReference'], { unique: true })
@Index(['status'])
@Index(['createdAt'])
export class OrderRefund {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Order ID (can have multiple refunds for partial refunds)
   */
  @Column()
  orderId: number;

  @ManyToOne(() => Order, (order) => order.refunds, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  /**
   * Unique refund reference
   * Format: REF-XXXXXXXXXX
   */
  @Column({ unique: true, length: 50 })
  refundReference: string;

  /**
   * Refund type (FULL or PARTIAL)
   */
  @Column({
    type: 'enum',
    enum: RefundType,
  })
  refundType: RefundType;

  /**
   * Refund method
   * ORIGINAL_PAYMENT: Refund to original payment method
   * WALLET: Refund to customer's wallet
   * BANK_ACCOUNT: Refund to bank account
   */
  @Column({
    type: 'enum',
    enum: RefundMethod,
    default: RefundMethod.ORIGINAL_PAYMENT,
  })
  refundMethod: RefundMethod;

  /**
   * Refund status
   */
  @Column({
    type: 'enum',
    enum: RefundStatus,
    default: RefundStatus.REQUESTED,
  })
  status: RefundStatus;

  /**
   * Amount requested for refund
   */
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amountRequested: number;

  /**
   * Amount approved for refund (may differ from requested)
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  amountApproved: number;

  /**
   * Amount actually refunded
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  amountRefunded: number;

  /**
   * Currency code
   */
  @Column({ length: 3, default: 'NGN' })
  currency: string;

  /**
   * Refund reason
   */
  @Column({
    type: 'enum',
    enum: RefundReason,
  })
  reason: RefundReason;

  /**
   * Additional reason notes
   */
  @Column({ type: 'text', nullable: true })
  reasonNotes: string;

  /**
   * User who requested the refund
   * Could be customer, merchant, or admin
   */
  @Column({ nullable: true })
  requestedBy: number;

  /**
   * User who approved the refund
   */
  @Column({ nullable: true })
  approvedBy: number;

  /**
   * User who processed the refund
   */
  @Column({ nullable: true })
  processedBy: number;

  /**
   * Platform refund transaction reference
   * (5% platform fee refund)
   */
  @Column({ length: 255, nullable: true })
  platformRefundReference: string;

  /**
   * Business refund transaction reference
   * (95% business amount refund)
   */
  @Column({ length: 255, nullable: true })
  businessRefundReference: string;

  /**
   * Provider metadata (JSON)
   * Store provider response for debugging
   */
  @Column({ type: 'jsonb', nullable: true })
  providerMetadata: any;

  /**
   * Refund request timestamp
   */
  @Column({ type: 'timestamp', nullable: true })
  requestedAt: Date;

  /**
   * Refund approval timestamp
   */
  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  /**
   * Refund processing timestamp
   */
  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date;

  /**
   * Refund completion timestamp
   */
  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  /**
   * Failure reason (if status = FAILED)
   */
  @Column({ type: 'text', nullable: true })
  failureReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
