import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Coupon } from './coupon.entity';
import { Order } from '../../order/entity/order.entity';
import { User } from '../../users/entity/user.entity';

/**
 * CouponUsage Entity - Coupon redemption tracking
 *
 * Purpose:
 * - Track who used which coupon when
 * - Enforce per-customer usage limits
 * - Generate coupon performance reports
 * - Detect coupon abuse
 */
@Entity('coupon_usage')
@Index(['couponId', 'createdAt'])
@Index(['orderId'])
@Index(['userId'])
@Index(['customerEmail'])
export class CouponUsage {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Coupon ID
   */
  @Column()
  couponId: number;

  @ManyToOne(() => Coupon, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'couponId' })
  coupon: Coupon;

  /**
   * Order ID
   */
  @Column()
  orderId: number;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  /**
   * User ID (null for guest orders)
   */
  @Column({ nullable: true })
  userId: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  /**
   * Customer email (for guest tracking)
   */
  @Column({ length: 255 })
  customerEmail: string;

  /**
   * Order subtotal before discount
   */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  orderSubtotal: number;

  /**
   * Discount amount applied
   */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  discountAmount: number;

  /**
   * Order total after discount
   */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  orderTotal: number;

  /**
   * Customer IP (fraud detection)
   */
  @Column({ length: 45, nullable: true })
  customerIp: string;

  /**
   * Was this the customer's first order?
   */
  @Column({ default: false })
  wasFirstOrder: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
