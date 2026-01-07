import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Business } from '../../businesses/business.entity';

/**
 * Email category for unsubscribe preferences
 */
export enum EmailCategory {
  MARKETING = 'marketing', // Cart reminders, promotions
  TRANSACTIONAL = 'transactional', // Order updates, refunds
  ALL = 'all', // Unsubscribe from everything
}

/**
 * Tracks email unsubscription preferences
 * Users can unsubscribe from specific categories (marketing, transactional)
 * either platform-wide or per-business
 */
@Entity('email_unsubscriptions')
@Index('IDX_unsubscription_email', ['email'])
@Index('IDX_unsubscription_token', ['unsubscribeToken'])
@Index('IDX_unsubscription_email_category_business', ['email', 'category', 'businessId'])
export class EmailUnsubscription {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Email address that unsubscribed
   */
  @Column()
  email: string;

  /**
   * Category of emails to unsubscribe from
   */
  @Column({ type: 'enum', enum: EmailCategory, default: EmailCategory.MARKETING })
  category: EmailCategory;

  /**
   * Business ID - null means platform-wide unsubscription
   */
  @Column({ nullable: true })
  businessId: number | null;

  @ManyToOne(() => Business, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  /**
   * Unique token for one-click unsubscribe links
   */
  @Column({ unique: true })
  unsubscribeToken: string;

  /**
   * Whether the unsubscription is active
   */
  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
