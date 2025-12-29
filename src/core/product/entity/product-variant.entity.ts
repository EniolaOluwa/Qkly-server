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
import { Product } from './product.entity';

/**
 * ProductVariant Entity - SKU (Stock Keeping Unit)
 *
 * Purpose:
 * - Handle product variations (size, color, material, etc.)
 * - Track inventory per variant
 * - Allow variant-specific pricing
 * - Support SKU codes for inventory management
 *
 * Examples:
 * - T-Shirt: variants for each size+color combo (S/Red, M/Blue, L/Green)
 * - Phone: variants for storage (64GB, 128GB, 256GB)
 * - Simple product: one default variant (no visible variations)
 */
@Entity('product_variants')
@Index(['productId', 'sku'], { unique: true })
@Index(['sku'])
@Index(['quantityInStock'])
@Index(['isActive'])
export class ProductVariant {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Parent product ID
   */
  @Column()
  productId: number;

  @ManyToOne(() => Product, (product) => product.variants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  /**
   * SKU code (Stock Keeping Unit)
   * Unique within product
   * Example: "TSHIRT-M-RED", "PHONE-128GB-BLACK"
   */
  @Column({ length: 100 })
  sku: string;

  /**
   * Variant name (displayed to customer)
   * Example: "Medium / Red", "128GB Black"
   */
  @Column({ length: 255 })
  variantName: string;

  /**
   * Variation options (JSON)
   * { "size": "M", "color": "Red" }
   * { "storage": "128GB", "color": "Black" }
   */
  @Column({ type: 'jsonb', nullable: true })
  options: Record<string, string>;

  /**
   * Variant-specific price (overrides product.basePrice)
   * Null means use product.basePrice
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number;

  /**
   * Compare-at price (for showing discounts)
   * "Was ₦5000, now ₦4000"
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  compareAtPrice: number;

  /**
   * Cost price (for profit margin calculation)
   * Not shown to customers
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  costPrice: number;

  /**
   * Quantity in stock
   * THIS is the source of truth for inventory
   */
  @Column({ name: 'quantityInStock', type: 'int', default: 0 })
  quantityInStock: number;

  /**
   * Reserved quantity (in active carts, pending orders)
   * Available quantity = quantityInStock - reservedQuantity
   */
  @Column({ type: 'int', default: 0 })
  reservedQuantity: number;

  /**
   * Low stock threshold
   * Trigger alert when quantityInStock <= this value
   */
  @Column({ type: 'int', default: 5 })
  lowStockThreshold: number;

  /**
   * Allow backorders (sell even when out of stock)
   */
  @Column({ default: false })
  allowBackorder: boolean;

  /**
   * Variant-specific weight (for shipping calculation)
   * In grams
   */
  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  weightGrams: number;

  /**
   * Barcode (UPC, EAN, ISBN)
   */
  @Column({ length: 100, nullable: true })
  barcode: string;

  /**
   * Variant visibility (can be hidden without deleting)
   */
  @Column({ default: true })
  isActive: boolean;

  /**
   * Is this the default variant for the product?
   * Used when product has no visible variations
   */
  @Column({ default: false })
  isDefault: boolean;

  /**
   * Variant-specific images (optional)
   * Links to ProductImage entities
   * If empty, use product's main images
   */
  @Column({ type: 'jsonb', nullable: true })
  imageIds: number[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
