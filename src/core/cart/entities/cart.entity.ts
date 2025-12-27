import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entity/user.entity';

/**
 * Cart Entity - Shopping cart
 *
 * Purpose:
 * - Persist cart for logged-in users
 * - Session-based cart for guests
 * - Track cart abandonment
 * - Merge carts on login
 */
@Entity('carts')
@Index(['userId'], { unique: true })
@Index(['sessionId'])
@Index(['updatedAt'])
export class Cart {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * User ID (null for guest carts)
   */
  /**
   * User ID (null for guest carts)
   */
  @Column({ type: 'int', unique: true, nullable: true })
  userId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /**
   * Session ID (for guest carts)
   * UUID generated on first cart addition
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  sessionId: string | null;

  /**
   * Cart status
   * ACTIVE: Currently being used
   * ABANDONED: Not updated in > 24 hours
   * CONVERTED: Converted to order
   * MERGED: Guest cart merged into user cart
   */
  @Column({ length: 20, default: 'ACTIVE' })
  status: string;

  /**
   * Cart subtotal (sum of items)
   * Calculated field for performance
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0.00 })
  subtotal: number;

  /**
   * Total items in cart
   */
  @Column({ type: 'int', default: 0 })
  itemCount: number;

  /**
   * Applied coupon code (if any)
   */
  @Column({ length: 50, nullable: true })
  couponCode: string;

  /**
   * Coupon discount amount
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
  discountAmount: number;

  /**
   * Currency code
   */
  @Column({ length: 3, default: 'NGN' })
  currency: string;

  /**
   * Customer IP (for fraud detection)
   */
  @Column({ length: 45, nullable: true })
  customerIp: string;

  /**
   * Customer user agent
   */
  @Column({ type: 'text', nullable: true })
  customerUserAgent: string;

  /**
   * Cart converted to order ID
   */
  @Column({ type: 'int', nullable: true })
  convertedToOrderId: number;

  /**
   * When cart was abandoned (updated_at + 24 hours)
   */
  @Column({ type: 'timestamp', nullable: true })
  abandonedAt: Date;

  /**
   * When cart was converted to order
   */
  @Column({ type: 'timestamp', nullable: true })
  convertedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
