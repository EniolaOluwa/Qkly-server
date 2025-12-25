import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * SystemEvent Entity - System events and errors
 *
 * Purpose:
 * - Log webhook events
 * - Track integration failures
 * - Debug payment provider issues
 * - Monitor system health
 */
@Entity('system_events')
@Index(['eventType'])
@Index(['status'])
@Index(['createdAt'])
@Index(['source'])
export class SystemEvent {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Event type
   * WEBHOOK_RECEIVED, WEBHOOK_FAILED
   * PAYMENT_INITIATED, PAYMENT_VERIFIED
   * EMAIL_SENT, EMAIL_FAILED
   * SETTLEMENT_PROCESSED, SETTLEMENT_FAILED
   * API_ERROR, INTEGRATION_ERROR
   */
  @Column({ length: 50 })
  eventType: string;

  /**
   * Event source
   * PAYSTACK, MAILGUN, RESEND, DOJAH, TERMII, SYSTEM
   */
  @Column({ length: 50 })
  source: string;

  /**
   * Event status
   * SUCCESS, FAILED, PENDING, RETRY
   */
  @Column({ length: 20 })
  status: string;

  /**
   * Event severity
   * INFO, WARNING, ERROR, CRITICAL
   */
  @Column({ length: 20, default: 'INFO' })
  severity: string;

  /**
   * Event message/description
   */
  @Column({ type: 'text' })
  message: string;

  /**
   * Related entity type
   */
  @Column({ length: 50, nullable: true })
  relatedEntityType: string;

  /**
   * Related entity ID
   */
  @Column({ nullable: true })
  relatedEntityId: number;

  /**
   * Request payload (JSON)
   * For webhook events, API calls
   */
  @Column({ type: 'jsonb', nullable: true })
  requestPayload: any;

  /**
   * Response payload (JSON)
   */
  @Column({ type: 'jsonb', nullable: true })
  responsePayload: any;

  /**
   * Error details (JSON)
   * Stack trace, error code, etc.
   */
  @Column({ type: 'jsonb', nullable: true })
  errorDetails: any;

  /**
   * HTTP status code (for API events)
   */
  @Column({ type: 'smallint', nullable: true })
  httpStatusCode: number;

  /**
   * Request duration (milliseconds)
   */
  @Column({ type: 'int', nullable: true })
  durationMs: number;

  /**
   * IP address (for webhook events)
   */
  @Column({ length: 45, nullable: true })
  ipAddress: string;

  /**
   * Webhook signature valid?
   */
  @Column({ nullable: true })
  signatureValid: boolean;

  /**
   * Retry count (for failed events)
   */
  @Column({ type: 'smallint', default: 0 })
  retryCount: number;

  /**
   * Next retry timestamp
   */
  @Column({ type: 'timestamp', nullable: true })
  nextRetryAt: Date;

  /**
   * Request ID (for correlation)
   */
  @Column({ length: 255, nullable: true })
  requestId: string;

  /**
   * Additional metadata (JSON)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;
}
