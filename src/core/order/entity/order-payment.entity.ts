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
import { Order } from './order.entity';
import { PaymentStatus, PaymentMethod, PaymentProvider } from '../../../common/enums/payment.enum';

/**
 * OrderPayment Entity - Payment information for an order
 *
 * Purpose:
 * - Store payment details separately from Order entity
 * - Track payment attempts, retries
 * - Support payment provider agnostic design
 * - Enable payment reconciliation
 *
 * Replaces Order.paymentDetails JSON field
 */
@Entity('order_payments')
@Index(['orderId'], { unique: true })
@Index(['paymentReference'], { unique: true })
@Index(['status'])
@Index(['createdAt'])
export class OrderPayment {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Order ID (unique - one payment per order)
   */
  @Column({ unique: true })
  orderId: number;

  @OneToOne(() => Order, (order) => order.payment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  /**
   * Unique payment reference
   * Format: PAY-XXXXXXXXXX
   */
  @Column({ unique: true, length: 50 })
  paymentReference: string;

  /**
   * Payment provider (PAYSTACK, etc.)
   */
  @Column({
    type: 'enum',
    enum: PaymentProvider,
    default: PaymentProvider.PAYSTACK,
  })
  provider: PaymentProvider;

  /**
   * Provider's transaction reference
   */
  @Column({ length: 255, nullable: true })
  providerReference: string;

  /**
   * Payment method used
   */
  @Column({
    type: 'enum',
    enum: PaymentMethod,
  })
  paymentMethod: PaymentMethod;

  /**
   * Payment status
   */
  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  /**
   * Amount paid (same as order.total)
   */
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  /**
   * Payment fee (charged by provider)
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0.00 })
  fee: number;

  /**
   * Net amount received (amount - fee)
   */
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  netAmount: number;

  /**
   * Currency code
   */
  @Column({ length: 3, default: 'NGN' })
  currency: string;

  /**
   * Payment authorization URL (for card payments)
   */
  @Column({ type: 'text', nullable: true })
  authorizationUrl: string;

  /**
   * Payment access code (Paystack)
   */
  @Column({ length: 255, nullable: true })
  accessCode: string;

  /**
   * Card details (last 4 digits, brand, etc.)
   * Stored as JSON for flexibility
   */
  @Column({ type: 'jsonb', nullable: true })
  cardDetails: {
    last4?: string;
    brand?: string;
    expiryMonth?: string;
    expiryYear?: string;
    cardType?: string;
    bank?: string;
  };

  /**
   * Bank details (for bank transfer)
   */
  @Column({ type: 'jsonb', nullable: true })
  bankDetails: {
    accountNumber?: string;
    accountName?: string;
    bankName?: string;
    reference?: string;
  };

  /**
   * Customer IP address (fraud detection)
   */
  @Column({ length: 45, nullable: true })
  customerIp: string;

  /**
   * Provider webhook response (JSON)
   * Store full webhook payload for debugging
   */
  @Column({ type: 'jsonb', nullable: true })
  providerResponse: any;

  /**
   * Payment initiation timestamp
   */
  @Column({ type: 'timestamp', nullable: true })
  initiatedAt: Date;

  /**
   * Payment completion timestamp
   */
  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  /**
   * Payment failure reason
   */
  @Column({ type: 'text', nullable: true })
  failureReason: string;

  /**
   * Payment expiry (for pending payments)
   */
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
