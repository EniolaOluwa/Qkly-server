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
import { Cart } from './cart.entity';
import { Product } from '../../product/entity/product.entity';
import { ProductVariant } from '../../product/entity/product-variant.entity';

/**
 * CartItem Entity - Individual items in cart
 *
 * Purpose:
 * - Track products in cart
 * - Link to specific product variant (SKU)
 * - Snapshot price at time of addition
 * - Enable cart item management
 */
@Entity('cart_items')
@Index(['cartId', 'variantId'], { unique: true })
@Index(['productId'])
export class CartItem {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Parent cart ID
   */
  @Column()
  cartId: number;

  @ManyToOne(() => Cart, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cartId' })
  cart: Cart;

  /**
   * Product ID
   */
  @Column()
  productId: number;

  @ManyToOne(() => Product, { nullable: false })
  @JoinColumn({ name: 'productId' })
  product: Product;

  /**
   * Product variant ID (specific SKU)
   */
  @Column()
  variantId: number;

  @ManyToOne(() => ProductVariant, { nullable: false })
  @JoinColumn({ name: 'variantId' })
  variant: ProductVariant;

  /**
   * Quantity
   */
  @Column({ type: 'int', default: 1 })
  quantity: number;

  /**
   * Price per unit at time of addition (snapshot)
   * Preserve pricing even if product price changes
   */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  /**
   * Subtotal (unitPrice * quantity)
   */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  /**
   * Product name (snapshot)
   */
  @Column({ length: 255 })
  productName: string;

  /**
   * Variant name (snapshot)
   */
  @Column({ length: 255, nullable: true })
  variantName: string;

  /**
   * Product image URL (snapshot)
   */
  @Column({ type: 'text', nullable: true })
  imageUrl: string;

  /**
   * Stock reservation ID (if stock reserved)
   */
  @Column({ nullable: true })
  stockReservationId: number;

  /**
   * Customer notes for this item
   */
  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
