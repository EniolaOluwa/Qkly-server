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
import { User } from '../../users/entity/user.entity';

/**
 * CustomerProfile Entity - Unified customer tracking
 *
 * Purpose:
 * - Track both guest and registered customers
 * - Link guest orders by email before registration
 * - Migrate guest profile to user account on registration
 * - Enable customer analytics (CLV, purchase frequency, etc.)
 *
 * For registered users: userId is set
 * For guest customers: userId is null, tracked by email
 */
@Entity('customer_profiles')
@Index(['email'])
@Index(['userId'], { unique: true })
@Index(['createdAt'])
export class CustomerProfile {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Linked user ID (null for guests)
   */
  @Column({ unique: true, nullable: true })
  userId: number;

  @OneToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /**
   * Customer email (primary identifier for guests)
   */
  @Column({ length: 255 })
  email: string;

  /**
   * Customer full name
   * For guests: captured at checkout
   * For registered: synced from UserProfile
   */
  @Column({ length: 255, nullable: true })
  fullName: string;

  /**
   * Customer phone number
   */
  @Column({ length: 20, nullable: true })
  phone: string;

  /**
   * Is this a registered user or guest?
   */
  @Column({ default: false })
  isRegistered: boolean;

  /**
   * First order date
   */
  @Column({ type: 'timestamp', nullable: true })
  firstOrderAt: Date;

  /**
   * Last order date
   */
  @Column({ type: 'timestamp', nullable: true })
  lastOrderAt: Date;

  /**
   * Total number of orders
   */
  @Column({ type: 'int', default: 0 })
  orderCount: number;

  /**
   * Total amount spent (all orders)
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0.00 })
  totalSpent: number;

  /**
   * Average order value
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0.00 })
  averageOrderValue: number;

  /**
   * Customer lifetime value (projected)
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0.00 })
  lifetimeValue: number;

  /**
   * Marketing preferences (JSON)
   * { emailMarketing: boolean, smsMarketing: boolean }
   */
  @Column({ type: 'jsonb', nullable: true })
  marketingPreferences: {
    emailMarketing?: boolean;
    smsMarketing?: boolean;
  };

  /**
   * Customer notes (admin only)
   */
  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
