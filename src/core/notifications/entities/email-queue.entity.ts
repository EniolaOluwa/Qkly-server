import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { EmailStatus, EmailProvider, NotificationType } from '../../../common/enums/notification.enum';

/**
 * EmailQueue Entity - Asynchronous email processing
 *
 * Purpose:
 * - Queue emails for async sending
 * - Retry failed emails
 * - Track email delivery status
 * - Prevent blocking request threads
 */
@Entity('email_queue')
@Index(['status'])
@Index(['scheduledFor'])
@Index(['recipientEmail'])
@Index(['emailType'])
export class EmailQueue {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Email type (for categorization)
   */
  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  emailType: NotificationType;

  /**
   * Email status
   */
  @Column({
    type: 'enum',
    enum: EmailStatus,
    default: EmailStatus.QUEUED,
  })
  status: EmailStatus;

  /**
   * Email provider
   */
  @Column({
    type: 'enum',
    enum: EmailProvider,
    default: EmailProvider.RESEND,
  })
  provider: EmailProvider;

  /**
   * Recipient email
   */
  @Column({ length: 255 })
  recipientEmail: string;

  /**
   * Recipient name
   */
  @Column({ length: 255, nullable: true })
  recipientName: string;

  /**
   * Sender email (from address)
   */
  @Column({ length: 255, default: 'noreply@qkly.com' })
  senderEmail: string;

  /**
   * Sender name
   */
  @Column({ length: 255, default: 'Qkly' })
  senderName: string;

  /**
   * Email subject
   */
  @Column({ length: 500 })
  subject: string;

  /**
   * Email body (HTML)
   */
  @Column({ type: 'text' })
  htmlBody: string;

  /**
   * Email body (plain text fallback)
   */
  @Column({ type: 'text', nullable: true })
  textBody: string;

  /**
   * Template ID (if using email template)
   */
  @Column({ length: 100, nullable: true })
  templateId: string;

  /**
   * Template variables (JSON)
   */
  @Column({ type: 'jsonb', nullable: true })
  templateVariables: any;

  /**
   * Attachments (JSON array)
   */
  @Column({ type: 'jsonb', nullable: true })
  attachments: Array<{
    filename: string;
    url: string;
    contentType?: string;
  }>;

  /**
   * Related entity type (Order, User, etc.)
   */
  @Column({ length: 50, nullable: true })
  relatedEntityType: string;

  /**
   * Related entity ID
   */
  @Column({ nullable: true })
  relatedEntityId: number;

  /**
   * Scheduled send time (null = send immediately)
   */
  @Column({ type: 'timestamp', nullable: true })
  scheduledFor: Date;

  /**
   * Sent timestamp
   */
  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;

  /**
   * Provider message ID
   */
  @Column({ length: 255, nullable: true })
  providerMessageId: string;

  /**
   * Provider response (JSON)
   */
  @Column({ type: 'jsonb', nullable: true })
  providerResponse: any;

  /**
   * Retry count
   */
  @Column({ type: 'smallint', default: 0 })
  retryCount: number;

  /**
   * Max retries allowed
   */
  @Column({ type: 'smallint', default: 3 })
  maxRetries: number;

  /**
   * Next retry timestamp
   */
  @Column({ type: 'timestamp', nullable: true })
  nextRetryAt: Date;

  /**
   * Failure reason
   */
  @Column({ type: 'text', nullable: true })
  failureReason: string;

  /**
   * Priority (higher = send first)
   */
  @Column({ type: 'smallint', default: 5 })
  priority: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
