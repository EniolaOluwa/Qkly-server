import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entity/user.entity';
import { Business } from '../../businesses/business.entity';
import { Order } from '../../order/entity/order.entity';


export enum TransactionType {
  ORDER_PAYMENT = 'ORDER_PAYMENT',
  SETTLEMENT = 'SETTLEMENT',
  WITHDRAWAL = 'WITHDRAWAL',
  REFUND = 'REFUND',
  WALLET_FUNDING = 'WALLET_FUNDING',
  PAYOUT = 'PAYOUT', // Added for transfers
  FEE = 'FEE',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
}

export enum TransactionFlow {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

@Entity('transactions')
@Index(['userId', 'businessId'])
@Index(['createdAt'])
@Index(['status'])
@Index(['type'])
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: false })
  reference: string;

  @Column({ nullable: true })
  @Index()
  userId: number | null;


  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  @Index()
  businessId: number | null

  @ManyToOne(() => Business, { nullable: true })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column({ nullable: true })
  @Index()
  orderId: number;

  @ManyToOne(() => Order, { nullable: true })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({
    type: 'enum',
    enum: TransactionType,
    nullable: false,
  })
  type: TransactionType;

  @Column({
    type: 'enum',
    enum: TransactionFlow,
    nullable: false,
  })
  flow: TransactionFlow;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: false })
  amount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  fee: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: false })
  netAmount: number; // amount - fee

  @Column({ type: 'varchar', length: 3, default: 'NGN' })
  currency: string;

  @Column({ type: 'varchar', nullable: true })
  paymentMethod: string;

  @Column({ type: 'varchar', nullable: true })
  paymentProvider: string;

  @Column({ type: 'varchar', nullable: true })
  providerReference: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', nullable: true })
  senderAccountNumber: string;

  @Column({ type: 'varchar', nullable: true })
  senderAccountName: string;

  @Column({ type: 'varchar', nullable: true })
  senderBankName: string;

  @Column({ type: 'varchar', nullable: true })
  recipientAccountNumber: string;

  @Column({ type: 'varchar', nullable: true })
  recipientAccountName: string;

  @Column({ type: 'varchar', nullable: true })
  recipientBankName: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  balanceBefore: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  balanceAfter: number;

  @Column({ type: 'json', nullable: true })
  metadata: any;

  @Column({ type: 'json', nullable: true })
  providerResponse: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  settledAt: Date;
}