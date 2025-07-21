import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Business } from '../businesses/business.entity';
import { Product } from './product.entity';

export enum OrderStatus {
  ORDERED = 'ordered',
  DISPATCHED = 'dispatched',
  DELIVERED = 'delivered',
  RETURNED = 'returned',
}

export enum TransactionMedium {
  WEB = 'web',
  MOBILE = 'mobile',
}

export enum TransactionStatus {
  PENDING = 'pending',
  SUCCESSFUL = 'successful',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  userId: number;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: false })
  businessId: number;

  @ManyToOne(() => Business, { nullable: false })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column({ unique: true, nullable: false })
  transactionRef: string;

  @Column({ nullable: false })
  customerName: string;

  @Column({ type: 'text', nullable: false })
  deliveryAddress: string;

  @Column({ nullable: false })
  state: string;

  @Column({ nullable: false })
  customerEmail: string;

  @Column({ nullable: false })
  customerPhoneNumber: string;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.ORDERED,
  })
  orderStatus: OrderStatus;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  transactionStatus: TransactionStatus;

  @Column({
    type: 'enum',
    enum: TransactionMedium,
    nullable: false,
  })
  transactionMedium: TransactionMedium;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  dateOfTransaction: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Product details and variants',
  })
  productDetails: any;

  @Column({ nullable: true })
  productId: number;

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
