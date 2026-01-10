import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * WebhookEvent Entity - Webhook idempotency tracking
 *
 * Purpose:
 * - Prevent duplicate webhook processing (Paystack can send duplicates)
 * - Track all webhook events for audit and debugging
 * - Enable webhook replay/reprocessing if needed
 *
 * Key Features:
 * - Unique constraint on provider + eventId for idempotency
 * - Stores full raw payload for debugging
 * - Tracks processing status and errors
 */
@Entity('webhook_events')
@Index(['provider', 'eventId'], { unique: true })
@Index(['eventType'])
@Index(['processed'])
@Index(['createdAt'])
export class WebhookEvent {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Payment provider (PAYSTACK, etc.)
   */
  @Column({ length: 50 })
  provider: string;

  /**
   * Unique event ID from provider (Paystack sends 'id' in webhook)
   * Used for idempotency - same eventId won't be processed twice
   */
  @Column({ length: 255 })
  eventId: string;

  /**
   * Event type (e.g., 'charge.success', 'transfer.success')
   */
  @Column({ length: 100 })
  eventType: string;

  /**
   * Related reference (payment reference, transaction reference, etc.)
   */
  @Column({ length: 255, nullable: true })
  reference: string;

  /**
   * Full raw webhook payload (for debugging and replay)
   */
  @Column({ type: 'jsonb' })
  payload: any;

  /**
   * Whether this webhook has been processed
   */
  @Column({ default: false })
  processed: boolean;

  /**
   * Processing error message (if any)
   */
  @Column({ type: 'text', nullable: true })
  error: string;

  /**
   * Number of processing attempts
   */
  @Column({ default: 0 })
  attempts: number;

  /**
   * When processing was completed
   */
  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
