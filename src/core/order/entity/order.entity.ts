import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { DeliveryMethod, OrderStatus } from '../../../common/enums/order.enum';
import { PaymentMethod, PaymentStatus } from '../../../common/enums/payment.enum';
import { Business } from '../../businesses/business.entity';
import { Settlement } from '../../settlements/entities/settlement.entity';
import { User } from '../../users/entity/user.entity';
import { OrderItem } from './order-items.entity';
import { OrderPayment } from './order-payment.entity';
import { OrderRefund } from './order-refund.entity';
import { OrderShipment } from './order-shipment.entity';
import { OrderStatusHistory } from './order-status-history.entity';
import { Exclude } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

@Entity('orders')
@Index(['userId', 'businessId'])
@Index(['createdAt'])
@Index(['customerEmail'])
@Index(['status'])
@Index(['paymentStatus'])
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: false })
  orderReference: string;


  @Column({ type: 'int', nullable: true })
  @Index()
  cartId: number | null;

  @Column({ type: 'int', nullable: true })
  @Index()
  userId: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: false })
  @Index()
  businessId: number;

  @ManyToOne(() => Business, { nullable: false })
  @JoinColumn({ name: 'businessId' })
  @Exclude()
  business: Business;

  @Column({ unique: true, nullable: true })
  transactionReference: string;

  @Column({ nullable: false })
  customerName: string;

  @Column({ type: 'text', nullable: false })
  deliveryAddress: string;

  @Column({ nullable: false })
  state: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: false })
  @Index()
  customerEmail: string;

  @Column({ nullable: false })
  customerPhoneNumber: string;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    nullable: false,
  })
  paymentMethod: PaymentMethod;

  @Column({
    type: 'enum',
    enum: DeliveryMethod,
    nullable: false,
  })
  deliveryMethod: DeliveryMethod;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  shippingFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  tax: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0,
  })
  discount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  total: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  /**
   * ShipBubble/Logistics metadata
   * Stores address codes, request tokens, service codes
   */
  @Column({ type: 'jsonb', nullable: true })
  shippingMetadata: any;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order, {
    cascade: true,
    eager: true,
  })
  items: OrderItem[];

  @Column({ type: 'boolean', default: false })
  isGuestOrder: boolean;

  // Relationships to new entities
  @OneToMany(() => OrderStatusHistory, (history) => history.order, { cascade: true })
  @ApiProperty({ type: () => [OrderStatusHistory] })
  statusHistoryRecords: OrderStatusHistory[];

  @OneToOne(() => OrderPayment, (payment) => payment.order, { cascade: true })
  payment: OrderPayment;

  @OneToMany(() => OrderShipment, (shipment) => shipment.order, { cascade: true })
  shipments: OrderShipment[];

  @OneToMany(() => OrderRefund, (refund) => refund.order, { cascade: true })
  refunds: OrderRefund[];

  @OneToOne(() => Settlement, (settlement) => settlement.order)
  settlement: Settlement;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @BeforeInsert()
  generateOrderReference() {
    if (!this.orderReference) {
      this.orderReference = `ORD-${uuidv4().substring(0, 8).toUpperCase()}`;
    }
    if (!this.transactionReference) {
      this.transactionReference = `TXN-${uuidv4().substring(0, 8).toUpperCase()}`;
    }
  }
}
