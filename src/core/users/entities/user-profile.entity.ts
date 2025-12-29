import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../entity/user.entity';

/**
 * UserProfile Entity - Personal information and preferences
 *
 * Separated from User for:
 * - Cleaner authentication queries (don't need to load profile)
 * - Easier profile updates without touching auth data
 * - Future: Support for multiple profiles (business vs personal)
 */
@Entity('user_profiles')
@Index(['userId'], { unique: true })
@Index(['phone'], { unique: true })
export class UserProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  userId: number;

  @OneToOne(() => User, (user) => user.profile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /**
   * First name (required for account creation)
   */
  @Column({ length: 100 })
  firstName: string;

  /**
   * Last name (required for account creation)
   */
  @Column({ length: 100 })
  lastName: string;

  /**
   * Phone number (unique, required for business creation)
   * Format: E.164 (+2348012345678)
   */
  @Column({ unique: true, length: 20 })
  phone: string;

  /**
   * Phone verification status
   * Set to true after SMS OTP verification
   */
  @Column({ default: false })
  isPhoneVerified: boolean;

  /**
   * Profile picture URL (Cloudinary)
   * Uploaded via /users/profile endpoint
   */
  @Column({ type: 'text', nullable: true })
  profilePicture: string;

  /**
   * User's preferred language (future use)
   */
  @Column({ length: 10, default: 'en' })
  language: string;

  /**
   * User's timezone (future use for scheduled emails)
   */
  @Column({ length: 50, default: 'Africa/Lagos' })
  timezone: string;

  /**
   * Last profile update timestamp
   */
  @UpdateDateColumn()
  updatedAt: Date;
}
