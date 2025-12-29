import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entity/user.entity';

/**
 * AuditLog Entity - System-wide audit trail
 *
 * Purpose:
 * - Track all critical actions
 * - Who did what, when, and why
 * - Before/after snapshots for data changes
 * - Compliance and debugging
 * - Immutable append-only log
 */
@Entity('audit_logs')
@Index(['entityType', 'entityId'])
@Index(['performedBy'])
@Index(['action'])
@Index(['createdAt'])
@Index(['ipAddress'])
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Entity type being audited
   * Example: 'User', 'Order', 'Product', 'Business'
   */
  @Column({ length: 50 })
  entityType: string;

  /**
   * Entity ID
   */
  @Column()
  entityId: number;

  /**
   * Action performed
   * CREATE, UPDATE, DELETE, LOGIN, LOGOUT, STATUS_CHANGE, etc.
   */
  @Column({ length: 50 })
  action: string;

  /**
   * User who performed the action (null for system actions)
   */
  @Column({ nullable: true })
  performedBy: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'performedBy' })
  user: User;

  /**
   * Actor type
   * USER: Regular user action
   * ADMIN: Admin panel action
   * SYSTEM: Automated system action
   * API: External API call
   */
  @Column({ length: 20, default: 'USER' })
  actorType: string;

  /**
   * IP address
   */
  @Column({ length: 45, nullable: true })
  ipAddress: string;

  /**
   * User agent
   */
  @Column({ type: 'text', nullable: true })
  userAgent: string;

  /**
   * Before state (JSON snapshot)
   * Null for CREATE actions
   */
  @Column({ type: 'jsonb', nullable: true })
  beforeState: any;

  /**
   * After state (JSON snapshot)
   * Null for DELETE actions
   */
  @Column({ type: 'jsonb', nullable: true })
  afterState: any;

  /**
   * Changed fields (array of field names)
   * For UPDATE actions
   */
  @Column({ type: 'jsonb', nullable: true })
  changedFields: string[];

  /**
   * Action reason/notes
   */
  @Column({ type: 'text', nullable: true })
  reason: string;

  /**
   * Additional metadata (JSON)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  /**
   * Request ID (for correlating logs)
   */
  @Column({ length: 255, nullable: true })
  requestId: string;

  /**
   * Severity level
   * INFO, WARNING, ERROR, CRITICAL
   */
  @Column({ length: 20, default: 'INFO' })
  severity: string;

  /**
   * Timestamp (indexed for time-range queries)
   */
  @CreateDateColumn()
  createdAt: Date;
}
