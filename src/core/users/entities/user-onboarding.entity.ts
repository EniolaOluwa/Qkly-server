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
import { OnboardingStep } from '../../../common/enums/user.enum';

/**
 * UserOnboarding Entity - Tracks user onboarding progress
 *
 * Used to guide new users through setup steps:
 * 1. Personal information
 * 2. Phone verification
 * 3. KYC verification (BVN)
 * 4. Business information (if merchant)
 * 5. Transaction PIN creation
 */
@Entity('user_onboarding')
@Index(['userId'], { unique: true })
export class UserOnboarding {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  userId: number;

  @OneToOne(() => User, (user) => user.onboarding, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /**
   * Current onboarding step
   */
  @Column({
    type: 'enum',
    enum: OnboardingStep,
    default: OnboardingStep.PERSONAL_INFORMATION,
  })
  currentStep: OnboardingStep;

  /**
   * Onboarding completion status
   */
  @Column({ default: false })
  isCompleted: boolean;

  /**
   * Timestamp when onboarding was completed
   */
  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  /**
   * Onboarding progress percentage (0-100)
   * Calculated based on completed steps
   */
  @Column({ type: 'smallint', default: 0 })
  progressPercentage: number;

  /**
   * Skipped steps (JSON array)
   * Some steps may be optional
   */
  @Column({ type: 'jsonb', nullable: true })
  skippedSteps: OnboardingStep[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
