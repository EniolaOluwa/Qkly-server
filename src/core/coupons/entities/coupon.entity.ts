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
import { Business } from '../../businesses/business.entity';
import { CouponType, CouponStatus } from '../../../common/enums/coupon.enum';

/**
 * Coupon Entity - Discount codes
 *
 * Purpose:
 * - Create discount campaigns
 * - Track coupon usage and limits
 * - Support various discount types
 * - Business-level coupon management
 */
@Entity('coupons')
@Index(['businessId'])
@Index(['code'], { unique: true })
@Index(['status'])
@Index(['validFrom', 'validUntil'])
export class Coupon {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Business ID (each business creates own coupons)
   */
  @Column()
  businessId: number;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  /**
   * Coupon code (uppercase, unique)
   * Example: "SUMMER2025", "WELCOME10"
   */
  @Column({ unique: true, length: 50 })
  code: string;

  /**
   * Coupon name/description (internal)
   */
  @Column({ length: 255 })
  name: string;

  /**
   * Coupon type
   * PERCENTAGE: Percentage off total
   * FIXED_AMOUNT: Fixed amount off total
   * FREE_SHIPPING: Free shipping
   * BUY_X_GET_Y: Buy X get Y free
   */
  @Column({
    type: 'enum',
    enum: CouponType,
  })
  couponType: CouponType;

  /**
   * Discount value
   * For PERCENTAGE: 10 = 10%
   * For FIXED_AMOUNT: 500 = ₦500
   */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  discountValue: number;

  /**
   * Coupon status
   */
  @Column({
    type: 'enum',
    enum: CouponStatus,
    default: CouponStatus.ACTIVE,
  })
  status: CouponStatus;

  /**
   * Minimum purchase amount required
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minPurchaseAmount: number;

  /**
   * Maximum discount cap (for percentage coupons)
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxDiscountAmount: number;

  /**
   * Total usage limit (across all customers)
   * Null = unlimited
   */
  @Column({ type: 'int', nullable: true })
  totalUsageLimit: number;

  /**
   * Per-customer usage limit
   * Null = unlimited
   */
  @Column({ type: 'int', nullable: true })
  perCustomerLimit: number;

  /**
   * Current usage count
   */
  @Column({ type: 'int', default: 0 })
  usageCount: number;

  /**
   * Valid from date
   */
  @Column({ type: 'timestamp', nullable: true })
  validFrom: Date;

  /**
   * Valid until date
   */
  @Column({ type: 'timestamp', nullable: true })
  validUntil: Date;

  /**
   * Specific product IDs this coupon applies to
   * Null = applies to all products
   */
  @Column({ type: 'jsonb', nullable: true })
  applicableProductIds: number[];

  /**
   * Specific category IDs this coupon applies to
   * Null = applies to all categories
   */
  @Column({ type: 'jsonb', nullable: true })
  applicableCategoryIds: number[];

  /**
   * Excluded product IDs
   */
  @Column({ type: 'jsonb', nullable: true })
  excludedProductIds: number[];

  /**
   * First-time customers only
   */
  @Column({ default: false })
  firstOrderOnly: boolean;

  /**
   * Can be combined with other coupons?
   */
  @Column({ default: false })
  stackable: boolean;

  /**
   * Created by user ID
   */
  @Column({ nullable: true })
  createdBy: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
