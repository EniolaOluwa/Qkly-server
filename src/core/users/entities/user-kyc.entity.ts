import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../entity/user.entity';
import { KYCStatus, KYCProvider, KYCTier } from '../../../common/enums/user.enum';

/**
 * UserKYC Entity - Know Your Customer verification data
 *
 * Stores sensitive KYC information separately from main User table
 * Required for wallet provisioning and business onboarding
 */
@Entity('user_kyc')
@Index(['userId'], { unique: true })
@Index(['status'])
export class UserKYC {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  userId: number;

  @OneToOne(() => User, (user) => user.kyc, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /**
   * Bank Verification Number (Nigeria)
   * 11-digit unique identifier
   * Encrypted at rest (use crypto.encrypt before saving)
   */
  @Column({ length: 255, nullable: true })
  bvn: string;

  /**
   * BVN verification status
   * PENDING: BVN submitted, awaiting verification
   * IN_PROGRESS: Verification in progress
   * VERIFIED: Dojah API confirmed match
   * FAILED: Verification failed (selfie mismatch, invalid BVN)
   * REJECTED: Manually rejected by admin
   */
  @Column({
    type: 'enum',
    enum: KYCStatus,
    default: KYCStatus.PENDING,
  })
  status: KYCStatus;

  /**
   * KYC verification provider (DOJAH, MANUAL)
   */
  @Column({
    type: 'enum',
    enum: KYCProvider,
    nullable: true,
  })
  verificationProvider: KYCProvider;

  /**
   * Provider's verification reference ID
   * For audit and re-verification
   */
  @Column({ length: 255, nullable: true })
  verificationReference: string;

  /**
   * Verification response from provider (JSON)
   * Store full response for debugging
   */
  @Column({ type: 'jsonb', nullable: true })
  verificationResponse: any;

  /**
   * Date when BVN was verified
   */
  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date;

  /**
   * Reason for failed verification
   */
  @Column({ type: 'text', nullable: true })
  failureReason: string;

  /**
   * Admin notes (for manual review)
   */
  @Column({ type: 'text', nullable: true })
  adminNotes: string;

  /**
   * KYC Tier Level
   * TIER_1: Phone Verified
   * TIER_2: BVN + Selfie Verified (Basic Wallet)
   * TIER_3: ID Card + Address Verified (Higher Limits)
   */
  @Column({
    type: 'enum',
    enum: KYCTier,
    default: KYCTier.TIER_1,
  })
  tier: KYCTier;

  @Column({ nullable: true })
  idType: string;

  @Column({ nullable: true })
  idNumber: string;

  @Column({ nullable: true })
  idImageUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
