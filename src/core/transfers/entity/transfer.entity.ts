import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entity/user.entity';
import { Business } from '../../businesses/business.entity';

export enum TransferStatus {
  SUCCESS = 'SUCCESS',
  PENDING = 'PENDING',
  OTP_REQUIRED = 'OTP_REQUIRED',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
}

@Entity('transfers')
export class Transfer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  userId: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  businessId: number;

  @ManyToOne(() => Business, { nullable: true })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column()
  reference: string;

  @Column({ nullable: true })
  transferCode: string; // From Paystack

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ default: 'NGN' })
  currency: string;

  @Column()
  recipientCode: string;

  @Column({ nullable: true })
  recipientAccountNumber: string;

  @Column({ nullable: true })
  recipientBankCode: string;

  @Column({ nullable: true })
  recipientName: string;

  @Column({ nullable: true })
  narration: string;

  @Column({
    type: 'enum',
    enum: TransferStatus,
    default: TransferStatus.PENDING,
  })
  status: TransferStatus;

  @Column({ type: 'jsonb', nullable: true })
  providerResponse: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
