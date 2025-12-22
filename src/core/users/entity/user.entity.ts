import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne
} from 'typeorm';
import { UserType } from '../../../common/auth/user-role.enum';
import { Business } from '../../businesses/business.entity';
import { OnboardingStep } from '../dto/onboarding-step.enum';
import { Role } from '../../roles/entities/role.entity';


export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
}


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

  @Column({ length: 20, nullable: false, unique: true })
  phone: string;

  @Column({ name: 'profile_picture', nullable: true})
  profilePicture?: string

  @Column({ length: 11, nullable: true })
  bvn: string;

  @Column({ nullable: true, comment: 'Encrypted PIN for user authentication' })
  pin: string;

  @Column({
    type: 'enum',
    enum: UserType,
    default: UserType.USER,
    comment: 'User type: user or admin',
  })
  userType: UserType;

  @Column({ nullable: true })
  roleId: number;


  @ManyToOne(() => Role, { nullable: true, eager: false })
  @JoinColumn({ name: 'roleId' })
  role: Role;


  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;


  @Column({ nullable: true, comment: 'Reason for suspension/ban' })
  statusReason: string;


  @Column({ type: 'timestamptz', nullable: true })
  suspendedUntil?: Date | null;

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
  personalAccountNumber: string;

  @Column({ nullable: true })
  personalAccountName: string;

  @Column({ nullable: true })
  personalBankName: string;

  @Column({ nullable: true })
  personalBankCode: string;

  @Column({ nullable: true, unique: true })
  businessId: number;

  @OneToOne(() => Business, (business) => business.user, { nullable: true })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ default: false })
  isPhoneVerified: boolean;

  @Column({
    type: 'enum',
    enum: OnboardingStep,
    default: OnboardingStep.PERSONAL_INFORMATION,
  })
  onboardingStep: OnboardingStep;

  @Column({ default: false })
  isOnboardingCompleted: boolean;

  @Column({ nullable: false })
  deviceId: string;

  @Column({ type: 'float', nullable: false })
  longitude: number;

  @Column({ type: 'float', nullable: false })
  latitude: number;

  @Column({ nullable: true })
  paystackCustomerCode: string;

  @Column({ nullable: true })
  paystackDedicatedAccountId: string;

  @Column({ type: 'varchar', default: 'PENDING' })
  paystackAccountStatus: string;

  @Column({ type: 'varchar', default: 'PAYSTACK' })
  paymentProvider: string;

  @Column({ default: 0 })
  pinFailedAttempts: number;

  @Column({ type: 'timestamptz', nullable: true })
  pinLockedUntil?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt?: Date | null;

  @Column({ nullable: true })
  lastLoginIp?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  createdBy: number;

  @Column({ nullable: true })
  suspendedBy?: number;
}