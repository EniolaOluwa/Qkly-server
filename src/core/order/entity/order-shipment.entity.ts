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
import { Order } from './order.entity';

/**
 * OrderShipment Entity - Shipping/delivery information
 *
 * Purpose:
 * - Track shipment details separately from Order entity
 * - Support multiple shipments per order (partial fulfillment)
 * - Enable carrier integration
 * - Store tracking information
 *
 * Replaces Order.deliveryDetails JSON field
 */
@Entity('order_shipments')
@Index(['orderId'])
@Index(['trackingNumber'])
@Index(['status'])
@Index(['createdAt'])
export class OrderShipment {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Order ID (can have multiple shipments for partial fulfillment)
   */
  @Column()
  orderId: number;

  @ManyToOne(() => Order, (order) => order.shipments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  /**
   * Carrier/courier name
   * Example: "DHL", "FedEx", "GIG Logistics"
   */
  @Column({ length: 100, nullable: true })
  carrier: string;

  /**
   * Tracking number
   */
  @Column({ length: 255, nullable: true })
  trackingNumber: string;

  /**
   * Tracking URL
   */
  @Column({ type: 'text', nullable: true })
  trackingUrl: string;

  /**
   * Shipment status
   * PENDING: Not yet shipped
   * PICKED_UP: Picked up by carrier
   * IN_TRANSIT: In transit
   * OUT_FOR_DELIVERY: Out for delivery
   * DELIVERED: Delivered to customer
   * FAILED: Delivery failed
   * RETURNED: Returned to sender
   */
  @Column({ length: 50, default: 'PENDING' })
  status: string;

  /**
   * Estimated delivery date
   */
  @Column({ type: 'timestamp', nullable: true })
  estimatedDeliveryDate: Date;

  /**
   * Actual delivery date
   */
  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  /**
   * Recipient name (from order)
   */
  @Column({ length: 255, nullable: true })
  recipientName: string;

  /**
   * Recipient phone (from order)
   */
  @Column({ length: 20, nullable: true })
  recipientPhone: string;

  /**
   * Shipping address (from order)
   */
  @Column({ type: 'text', nullable: true })
  shippingAddress: string;

  /**
   * Proof of delivery (image URL, signature, etc.)
   */
  @Column({ type: 'text', nullable: true })
  proofOfDelivery: string;

  /**
   * Delivery notes (special instructions, gate code, etc.)
   */
  @Column({ type: 'text', nullable: true })
  deliveryNotes: string;

  /**
   * Carrier metadata (JSON)
   * Store carrier API responses, tracking events
   */
  @Column({ type: 'jsonb', nullable: true })
  carrierMetadata: any;

  /**
   * Shipment date (when merchant shipped)
   */
  @Column({ type: 'timestamp', nullable: true })
  shippedAt: Date;

  /**
   * User who created the shipment (merchant)
   */
  @Column({ nullable: true })
  createdBy: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
