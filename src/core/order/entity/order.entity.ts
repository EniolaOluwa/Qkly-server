import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  BeforeInsert,
} from 'typeorm';
import { Business } from '../../businesses/business.entity';
import { User } from '../../users';
import {
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  DeliveryMethod,
  PaymentDetails,
  DeliveryDetails,
  SettlementDetails,
  RefundDetails,
} from '../interfaces/order.interface';
import { OrderItem } from './order-items.entity';
import { v4 as uuidv4 } from 'uuid';

@Entity('orders')
@Index(['userId', 'businessId'])
@Index(['createdAt'])
@Index(['status'])
@Index(['paymentStatus'])
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: false })
  orderReference: string;

  @Column({ nullable: true })
  @Index()
  userId: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: false })
  @Index()
  businessId: number;

  @ManyToOne(() => Business, { nullable: false })
  @JoinColumn({ name: 'businessId' })
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

  @Column({ nullable: true })
  paymentDate: Date;

  @Column({ type: 'json', nullable: true })
  paymentDetails: PaymentDetails;

  @Column({ nullable: true })
  estimatedDeliveryDate: Date;

  @Column({ nullable: true })
  deliveryDate: Date;

  @Column({ type: 'json', nullable: true })
  deliveryDetails: DeliveryDetails;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order, {
    cascade: true,
    eager: true,
  })
  items: OrderItem[];

  @Column({ type: 'boolean', default: false })
  isBusinessSettled: boolean;

  @Column({ nullable: true })
  settlementReference: string;

  @Column({ nullable: true })
  settlementDate: Date;

  @Column({ type: 'json', nullable: true })
  settlementDetails: SettlementDetails;

  @Column({ type: 'boolean', default: false })
  isRefunded: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  refundedAmount: number;

  @Column({ nullable: true })
  refundReference: string;

  @Column({ nullable: true })
  refundDate: Date;

  @Column({ type: 'json', nullable: true })
  refundDetails: RefundDetails;

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
