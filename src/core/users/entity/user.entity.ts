import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { UserType } from '../../../common/auth/user-role.enum';
import { Business } from '../../businesses/business.entity';
import { Role } from '../../roles/entities/role.entity';
import { UserProfile } from '../entities/user-profile.entity';
import { UserKYC } from '../entities/user-kyc.entity';
import { UserSecurity } from '../entities/user-security.entity';
import { UserOnboarding } from '../entities/user-onboarding.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { BankAccount } from '../../bank-accounts/entities/bank-account.entity';


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

  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @Column({ unique: true, nullable: false })
  email: string;

  @Column({ nullable: false })
  password: string;

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

  @Column({ nullable: true, unique: true })
  businessId: number;

  @OneToOne(() => Business, (business) => business.user, { nullable: true })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column({ default: false })
  isEmailVerified: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  createdBy: number;

  @Column({ nullable: true })
  suspendedBy?: number;

  // Relationships to new separated entities
  @ApiProperty({ type: () => UserProfile, description: 'User profile information' })
  @OneToOne(() => UserProfile, (profile) => profile.user, { cascade: true })
  profile: UserProfile;

  @OneToOne(() => UserKYC, (kyc) => kyc.user, { cascade: true })
  kyc: UserKYC;

  @OneToOne(() => UserSecurity, (security) => security.user, { cascade: true })
  security: UserSecurity;

  @OneToOne(() => UserOnboarding, (onboarding) => onboarding.user, { cascade: true })
  onboarding: UserOnboarding;

  @OneToOne(() => Wallet, (wallet) => wallet.user)
  wallet: Wallet;

  @OneToMany(() => BankAccount, (account) => account.user)
  bankAccounts: BankAccount[];
}