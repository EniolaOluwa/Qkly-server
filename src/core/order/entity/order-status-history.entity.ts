import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Order } from './order.entity';
import { OrderStatus } from '../../../common/enums/order.enum';

/**
 * OrderStatusHistory Entity - Order status timeline
 *
 * Purpose:
 * - Track every status change with timestamp
 * - Record who made the change (user, merchant, system, admin)
 * - Enable status transition audit
 * - Support timeline UI (order tracking page)
 *
 * Replaces Order.statusHistory JSON array for:
 * - Better queryability (find all orders that were SHIPPED today)
 * - Relational integrity
 * - Index performance
 */
@Entity('order_status_history')
@Index(['orderId', 'createdAt'])
@Index(['status'])
@Index(['triggeredByUserId'])
export class OrderStatusHistory {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Order ID
   */
  @Column()
  orderId: number;

  @ManyToOne(() => Order, (order) => order.statusHistoryRecords, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  /**
   * Status value at this point in time
   */
  @Column({
    type: 'enum',
    enum: OrderStatus,
  })
  status: OrderStatus;

  /**
   * Previous status (for validation, rollback)
   */
  @Column({
    type: 'enum',
    enum: OrderStatus,
    nullable: true,
  })
  previousStatus: OrderStatus;

  /**
   * Who triggered this status change?
   * USER: Customer action (e.g., cancelled before payment)
   * MERCHANT: Business owner action (e.g., accepted order)
   * SYSTEM: Automated (e.g., payment webhook, auto-complete)
   * ADMIN: Platform admin action (e.g., manual refund)
   */
  @Column({ length: 50 })
  triggeredBy: string; // 'USER' | 'MERCHANT' | 'SYSTEM' | 'ADMIN'

  /**
   * User ID who triggered (if applicable)
   * Null for SYSTEM actions
   */
  @Column({ nullable: true })
  triggeredByUserId: number;

  /**
   * Optional notes/reason for status change
   * Example: "Customer requested cancellation", "Payment failed - insufficient funds"
   */
  @Column({ type: 'text', nullable: true })
  notes: string;

  /**
   * Additional metadata (JSON)
   * Store extra context: webhook payload, admin reason, etc.
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  /**
   * Timestamp when status changed
   */
  @CreateDateColumn()
  createdAt: Date;
}
