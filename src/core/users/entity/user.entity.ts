import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Business } from '../../businesses/business.entity';
import { UserRole } from '../../../common/auth/user-role.enum';
import { OnboardingStep } from '../dto/onboarding-step.enum';

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

  @Column({ length: 11, nullable: true })
  bvn: string;

  @Column({ nullable: true, comment: 'Encrypted PIN for user authentication' })
  pin: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.MERCHANT,
    comment: 'User role: merchant or admin'
  })
  role: UserRole;

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


  @Column({ nullable: true, comment: 'User’s preferred bank account number for payouts' })
  personalAccountNumber: string;

  @Column({ nullable: true, comment: 'User’s preferred bank account name for payouts' })
  personalAccountName: string;

  @Column({ nullable: true, comment: 'User’s preferred bank name for payouts' })
  personalBankName: string;

  @Column({ nullable: true, comment: 'User’s preferred bank code for payouts' })
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
    comment: 'Current onboarding step for the user (0: Personal Info, 1: Phone Verification, 2: Business Info, 3: KYC, 4: PIN)'
  })
  onboardingStep: OnboardingStep;

  @Column({ default: false, comment: 'Whether user has completed all onboarding steps' })
  isOnboardingCompleted: boolean;

  @Column({ nullable: false })
  deviceId: string;

  @Column({ type: 'float', nullable: false })
  longitude: number;

  @Column({ type: 'float', nullable: false })
  latitude: number;


  @Column({ nullable: true, comment: 'Paystack customer code' })
  paystackCustomerCode: string;

  @Column({ nullable: true, comment: 'Paystack dedicated account ID' })
  paystackDedicatedAccountId: string;

  @Column({ type: 'varchar', default: 'PENDING', comment: 'DVA account status' })
  paystackAccountStatus: string;


  @Column({
    type: 'varchar',
    default: 'PAYSTACK',
    comment: 'Payment provider for this user'
  })
  paymentProvider: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
