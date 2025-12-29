import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { EmailQueue } from './email-queue.entity';

/**
 * EmailLog Entity - Email tracking and analytics
 *
 * Purpose:
 * - Track email opens
 * - Track link clicks
 * - Monitor email deliverability
 * - Generate email campaign reports
 */
@Entity('email_logs')
@Index(['emailQueueId'], { unique: true })
@Index(['recipientEmail'])
@Index(['opened'])
@Index(['clicked'])
export class EmailLog {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Email queue ID (unique - one log per email)
   */
  @Column({ unique: true })
  emailQueueId: number;

  @OneToOne(() => EmailQueue, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'emailQueueId' })
  emailQueue: EmailQueue;

  /**
   * Recipient email (denormalized for quick queries)
   */
  @Column({ length: 255 })
  recipientEmail: string;

  /**
   * Email delivered successfully
   */
  @Column({ default: false })
  delivered: boolean;

  /**
   * Delivery timestamp
   */
  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  /**
   * Email opened by recipient
   */
  @Column({ default: false })
  opened: boolean;

  /**
   * First open timestamp
   */
  @Column({ type: 'timestamp', nullable: true })
  firstOpenedAt: Date;

  /**
   * Last open timestamp
   */
  @Column({ type: 'timestamp', nullable: true })
  lastOpenedAt: Date;

  /**
   * Total open count
   */
  @Column({ type: 'int', default: 0 })
  openCount: number;

  /**
   * Any link clicked in email
   */
  @Column({ default: false })
  clicked: boolean;

  /**
   * First click timestamp
   */
  @Column({ type: 'timestamp', nullable: true })
  firstClickedAt: Date;

  /**
   * Last click timestamp
   */
  @Column({ type: 'timestamp', nullable: true })
  lastClickedAt: Date;

  /**
   * Total click count
   */
  @Column({ type: 'int', default: 0 })
  clickCount: number;

  /**
   * Email bounced
   */
  @Column({ default: false })
  bounced: boolean;

  /**
   * Bounce type (hard, soft)
   */
  @Column({ length: 20, nullable: true })
  bounceType: string;

  /**
   * Bounce reason
   */
  @Column({ type: 'text', nullable: true })
  bounceReason: string;

  /**
   * Bounced timestamp
   */
  @Column({ type: 'timestamp', nullable: true })
  bouncedAt: Date;

  /**
   * Recipient marked as spam
   */
  @Column({ default: false })
  markedAsSpam: boolean;

  /**
   * Spam marked timestamp
   */
  @Column({ type: 'timestamp', nullable: true })
  markedAsSpamAt: Date;

  /**
   * Recipient unsubscribed
   */
  @Column({ default: false })
  unsubscribed: boolean;

  /**
   * Unsubscribed timestamp
   */
  @Column({ type: 'timestamp', nullable: true })
  unsubscribedAt: Date;

  /**
   * Webhook events (JSON array)
   * Store all webhook events from provider
   */
  @Column({ type: 'jsonb', nullable: true })
  webhookEvents: any[];

  @CreateDateColumn()
  createdAt: Date;
}
