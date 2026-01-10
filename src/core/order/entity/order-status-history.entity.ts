import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Order } from './order.entity';
import { OrderStatus } from '../../../common/enums/order.enum';
import { Exclude } from 'class-transformer';

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
  @ApiProperty({ description: 'Unique identifier for the history record', example: 1 })
  @Exclude()
  id: number;

  /**
   * Order ID
   */
  @Column()
  @ApiProperty({ description: 'ID of the order this history belongs to', example: 123 })
  @Exclude()
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
  @ApiProperty({ description: 'Status of the order at this point in time', enum: OrderStatus, example: OrderStatus.PROCESSING })
  status: OrderStatus;

  /**
   * Previous status (for validation, rollback)
   */
  @Column({
    type: 'enum',
    enum: OrderStatus,
    nullable: true,
  })
  @ApiProperty({ description: 'Previous status of the order', enum: OrderStatus, nullable: true, example: OrderStatus.PROCESSING })
  previousStatus: OrderStatus;

  /**
   * Who triggered this status change?
   * USER: Customer action (e.g., cancelled before payment)
   * MERCHANT: Business owner action (e.g., accepted order)
   * SYSTEM: Automated (e.g., payment webhook, auto-complete)
   * ADMIN: Platform admin action (e.g., manual refund)
   */
  @Column({ length: 50 })
  @ApiProperty({ description: 'Who triggered this status change', example: 'MERCHANT' })
  @Exclude()
  triggeredBy: string; // 'USER' | 'MERCHANT' | 'SYSTEM' | 'ADMIN'

  /**
   * User ID who triggered (if applicable)
   * Null for SYSTEM actions
   */
  @Column({ nullable: true })
  @ApiProperty({ description: 'ID of the user who triggered the change (optional)', nullable: true, example: 5 })
  @Exclude()
  triggeredByUserId: number;

  /**
   * Optional notes/reason for status change
   * Example: "Customer request cancellation", "Payment failed - insufficient funds"
   */
  @Column({ type: 'text', nullable: true })
  @ApiProperty({ description: 'Optional notes or reason for status change', nullable: true, example: 'Customer requested cancellation' })
  notes: string;

  /**
   * Additional metadata (JSON)
   * Store extra context: webhook payload, admin reason, etc.
   */
  @Column({ type: 'jsonb', nullable: true })
  @ApiProperty({ description: 'Additional metadata (JSON)', nullable: true })
  // @Exclude()
  metadata: any;

  /**
   * Timestamp when status changed
   */
  @CreateDateColumn()
  @ApiProperty({ description: 'Timestamp when the status changed', example: '2024-01-15T12:00:00Z' })
  @Exclude()
  createdAt: Date;
}
