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
import { ProductVariant } from '../../product/entity/product-variant.entity';
import { ReservationStatus } from '../../../common/enums/inventory.enum';

/**
 * StockReservation Entity - Temporary inventory holds
 *
 * Purpose:
 * - Reserve stock when item added to cart
 * - Prevent overselling during checkout
 * - Auto-release after expiry (15 minutes)
 * - Convert to sale when order paid
 *
 * Workflow:
 * 1. Add to cart → Create PENDING reservation
 * 2. Checkout → Extend reservation expiry
 * 3. Payment success → Mark FULFILLED, deduct stock
 * 4. Payment failed / cart abandoned → Mark RELEASED, return stock
 * 5. Cron job expires old PENDING reservations
 */
@Entity('stock_reservations')
@Index(['variantId', 'status'])
@Index(['expiresAt'])
@Index(['cartId'])
@Index(['orderId'])
@Index(['status'])
export class StockReservation {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Product variant being reserved
   */
  @Column()
  variantId: number;

  @ManyToOne(() => ProductVariant, { nullable: false })
  @JoinColumn({ name: 'variantId' })
  variant: ProductVariant;

  /**
   * Quantity reserved
   */
  @Column({ type: 'int' })
  quantity: number;

  /**
   * Reservation status
   * PENDING: Active reservation
   * FULFILLED: Converted to sale (order paid)
   * RELEASED: Reservation cancelled/expired
   * EXPIRED: Auto-expired by cron job
   */
  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.PENDING,
  })
  status: ReservationStatus;

  /**
   * Cart ID (if reservation for cart item)
   */
  @Column({ type: 'int', nullable: true })
  cartId: number;

  /**
   * Cart item ID
   */
  @Column({ type: 'int', nullable: true })
  cartItemId: number;

  /**
   * Order ID (if reservation converted to order)
   */
  @Column({ type: 'int', nullable: true })
  orderId: number;

  /**
   * User ID (null for guest reservations)
   */
  @Column({ type: 'int', nullable: true })
  userId: number;

  /**
   * Session ID (for guest carts)
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  sessionId: string;

  /**
   * Reservation expiry timestamp
   * Default: 15 minutes from creation
   * Extended during checkout
   */
  @Column({ type: 'timestamp' })
  expiresAt: Date;

  /**
   * Date when reservation was fulfilled (order paid)
   */
  @Column({ type: 'timestamp', nullable: true })
  fulfilledAt: Date;

  /**
   * Date when reservation was released
   */
  @Column({ type: 'timestamp', nullable: true })
  releasedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
