import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { CustomerProfile } from './customer-profile.entity';

/**
 * Address Entity - Reusable shipping/billing addresses
 *
 * Purpose:
 * - Store customer addresses for reuse
 * - Support multiple addresses per customer
 * - Mark default shipping address
 * - Enable address book feature
 */
@Entity('addresses')
@Index(['customerProfileId'])
@Index(['isPrimary'])
export class Address {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Customer profile ID
   */
  @Column()
  customerProfileId: number;

  @ManyToOne(() => CustomerProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customerProfileId' })
  customerProfile: CustomerProfile;

  /**
   * Address type
   * SHIPPING: Delivery address
   * BILLING: Billing address
   * BOTH: Use for both shipping and billing
   */
  @Column({ length: 20, default: 'SHIPPING' })
  addressType: string;

  /**
   * Full name (recipient)
   */
  @Column({ length: 255 })
  fullName: string;

  /**
   * Phone number
   */
  @Column({ length: 20 })
  phone: string;

  /**
   * Street address line 1
   */
  @Column({ type: 'text' })
  addressLine1: string;

  /**
   * Street address line 2 (optional)
   */
  @Column({ type: 'text', nullable: true })
  addressLine2: string;

  /**
   * City
   */
  @Column({ length: 100 })
  city: string;

  /**
   * State/Province
   */
  @Column({ length: 100 })
  state: string;

  /**
   * Postal/ZIP code
   */
  @Column({ length: 20, nullable: true })
  postalCode: string;

  /**
   * Country code (ISO 3166-1 alpha-2)
   */
  @Column({ length: 2, default: 'NG' })
  countryCode: string;

  /**
   * Is this the primary/default address?
   */
  @Column({ default: false })
  isPrimary: boolean;

  /**
   * Address label (Home, Office, etc.)
   */
  @Column({ length: 50, nullable: true })
  label: string;

  /**
   * Delivery notes (gate code, landmarks, etc.)
   */
  @Column({ type: 'text', nullable: true })
  deliveryNotes: string;

  /**
   * Coordinates for delivery (latitude)
   */
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number;

  /**
   * Coordinates for delivery (longitude)
   */
  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
