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
 * UserSecurity Entity - Security-related data
 *
 * Handles:
 * - Transaction PIN (4-digit encrypted)
 * - PIN lockout after failed attempts
 * - Device fingerprinting (future use for device-based 2FA)
 * - Session management
 */
@Entity('user_security')
@Index(['userId'], { unique: true })
export class UserSecurity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  userId: number;

  @OneToOne(() => User, (user) => user.security, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /**
   * Transaction PIN (4-digit)
   * Hashed using bcrypt (like passwords)
   * Required for wallet transfers, withdrawals
   *
   * IMPORTANT: Do NOT use simple encryption - use bcrypt.hash()
   * Current implementation uses crypto.encrypt (should be migrated)
   */
  @Column({ length: 255, nullable: true })
  pin: string;

  /**
   * Failed PIN attempt counter
   * Incremented on wrong PIN, reset on correct PIN
   * Locked after 5 attempts
   */
  @Column({ default: 0 })
  pinFailedAttempts: number;

  /**
   * PIN lockout expiry (5 minutes after 5th failed attempt)
   * User cannot enter PIN until this time passes
   */
  @Column({ type: 'timestamp', nullable: true })
  pinLockedUntil: Date;

  /**
   * Device ID for fingerprinting (future use)
   * Can be used for trusted device recognition
   */
  @Column({ length: 255, nullable: true })
  deviceId: string;

  /**
   * Last known geolocation (latitude)
   * For fraud detection (unusual location login)
   */
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number;

  /**
   * Last known geolocation (longitude)
   */
  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number;

  /**
   * Two-factor authentication enabled (future use)
   */
  @Column({ default: false })
  twoFactorEnabled: boolean;

  /**
   * 2FA secret key (TOTP) - encrypted
   */
  @Column({ length: 255, nullable: true })
  twoFactorSecret: string;

  /**
   * Trusted device tokens (JSON array of device hashes)
   * Devices that don't require 2FA
   */
  @Column({ type: 'jsonb', nullable: true })
  trustedDevices: string[];

  @UpdateDateColumn()
  updatedAt: Date;
}
