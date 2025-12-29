import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Product } from '../../product/entity/product.entity';
import { ProductVariant } from '../../product/entity/product-variant.entity';
import { InventoryAdjustmentType } from '../../../common/enums/inventory.enum';

/**
 * InventoryLog Entity - Audit trail for stock changes
 *
 * Purpose:
 * - Track every stock change with reason
 * - Enable inventory reconciliation
 * - Debug stock discrepancies
 * - Generate inventory reports
 *
 * Every change to ProductVariant.quantityInStock must create a log entry
 */
@Entity('inventory_logs')
@Index(['productId', 'variantId', 'createdAt'])
@Index(['type'])
@Index(['orderId'])
export class InventoryLog {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Product ID
   */
  @Column()
  productId: number;

  @ManyToOne(() => Product, { nullable: false })
  @JoinColumn({ name: 'productId' })
  product: Product;

  /**
   * Variant ID (specific SKU affected)
   */
  @Column()
  variantId: number;

  @ManyToOne(() => ProductVariant, { nullable: false })
  @JoinColumn({ name: 'variantId' })
  variant: ProductVariant;

  /**
   * Adjustment type
   * SALE: Stock sold (order placed)
   * RETURN: Stock returned (order refunded/cancelled)
   * RESTOCK: Manual restock by merchant
   * ADJUSTMENT: Manual correction
   * DAMAGED: Stock damaged/lost
   * RESERVATION: Reserved for cart/pending order
   * RELEASE: Released reservation (cart abandoned, payment failed)
   */
  @Column({
    type: 'enum',
    enum: InventoryAdjustmentType,
  })
  type: InventoryAdjustmentType;

  /**
   * Quantity change (positive or negative)
   * SALE: -5 (5 units sold)
   * RETURN: +5 (5 units returned)
   * RESTOCK: +100 (100 units added)
   */
  @Column({ type: 'int' })
  quantityChange: number;

  /**
   * Stock quantity before this change
   */
  @Column({ type: 'int' })
  quantityBefore: number;

  /**
   * Stock quantity after this change
   */
  @Column({ type: 'int' })
  quantityAfter: number;

  /**
   * Related order ID (if type = SALE or RETURN)
   */
  @Column({ nullable: true })
  orderId: number;

  /**
   * Related order item ID
   */
  @Column({ nullable: true })
  orderItemId: number;

  /**
   * User who performed the action (merchant, admin)
   * Null for system actions (automated sale, return)
   */
  @Column({ nullable: true })
  performedBy: number;

  /**
   * Reason for adjustment (required for ADJUSTMENT, DAMAGED types)
   */
  @Column({ type: 'text', nullable: true })
  reason: string;

  /**
   * Additional metadata (JSON)
   * Store extra context (supplier info, batch number, etc.)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;
}
