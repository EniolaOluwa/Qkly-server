import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Business } from '../businesses/business.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: false })
  email: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: false })
  password: string;

  @Column({ length: 13, nullable: false })
  phone: string;

  @Column({ length: 11, nullable: true })
  bvn: string;

  @Column({ nullable: true, comment: 'Encrypted PIN for user authentication' })
  pin: string;

  @Column({ nullable: true, comment: 'Monnify wallet reference' })
  walletReference: string;

  @Column({ nullable: true, comment: 'Monnify wallet account number' })
  walletAccountNumber: string;

  @Column({ nullable: true, comment: 'Monnify wallet account name' })
  walletAccountName: string;

  @Column({ nullable: true, comment: 'Monnify wallet bank name' })
  walletBankName: string;

  @Column({ nullable: true, comment: 'Monnify wallet bank code' })
  walletBankCode: string;

  @Column({ nullable: true })
  businessId: number;

  @ManyToOne(() => Business, { nullable: true })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ default: false })
  isPhoneVerified: boolean;

  @Column({ nullable: true })
  deviceId: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  longitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
