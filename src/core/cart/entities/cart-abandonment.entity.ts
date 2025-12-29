import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Cart } from './cart.entity';

/**
 * CartAbandonment Entity - Cart abandonment tracking
 *
 * Purpose:
 * - Track abandoned carts for recovery campaigns
 * - Schedule reminder emails (24h, 48h, 72h)
 * - Track email delivery and recovery success
 * - Calculate cart abandonment rate
 */
@Entity('cart_abandonments')
@Index(['cartId'], { unique: true })
@Index(['status'])
@Index(['nextReminderAt'])
export class CartAbandonment {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Cart ID (unique - one abandonment record per cart)
   */
  @Column({ type: 'int', unique: true })
  cartId: number;

  @OneToOne(() => Cart, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cartId' })
  cart: Cart;

  /**
   * Abandonment status
   * IDENTIFIED: Cart identified as abandoned
   * REMINDER_SENT: First reminder sent
   * REMINDER_2_SENT: Second reminder sent
   * REMINDER_3_SENT: Third reminder sent
   * RECOVERED: Customer returned and completed purchase
   * EXPIRED: Too old to recover (> 30 days)
   */
  @Column({ length: 30, default: 'IDENTIFIED' })
  status: string;

  /**
   * Customer email (for sending reminders)
   */
  @Column({ length: 255, nullable: true })
  customerEmail: string;

  /**
   * Cart total value (for prioritizing high-value carts)
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0.00 })
  cartValue: number;

  /**
   * Number of items in cart
   */
  @Column({ type: 'int', default: 0 })
  itemCount: number;

  /**
   * First reminder sent at
   */
  @Column({ type: 'timestamp', nullable: true })
  firstReminderSentAt: Date;

  /**
   * Second reminder sent at
   */
  @Column({ type: 'timestamp', nullable: true })
  secondReminderSentAt: Date;

  /**
   * Third reminder sent at
   */
  @Column({ type: 'timestamp', nullable: true })
  thirdReminderSentAt: Date;

  /**
   * Next reminder scheduled at
   */
  @Column({ type: 'timestamp', nullable: true })
  nextReminderAt: Date;

  /**
   * Cart recovered (customer completed purchase)
   */
  @Column({ default: false })
  isRecovered: boolean;

  /**
   * Recovery date
   */
  @Column({ type: 'timestamp', nullable: true })
  recoveredAt: Date;

  /**
   * Order ID (if recovered)
   */
  @Column({ type: 'int', nullable: true })
  recoveredOrderId: number;

  /**
   * Recovery discount code offered
   */
  @Column({ length: 50, nullable: true })
  recoveryDiscountCode: string;

  /**
   * Recovery email campaign metadata (JSON)
   */
  @Column({ type: 'jsonb', nullable: true })
  campaignMetadata: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
