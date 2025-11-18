import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, OneToMany, JoinColumn, BeforeInsert } from 'typeorm';
import { Business } from '../../businesses/business.entity';
import { User } from '../../users/entity/user.entity';
import { Leads } from './leads.entity';
import { shortUUID } from '../../../common/utils/uuid.utils';

@Entity({ name: 'lead-forms' })
export class LeadForm {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'button_text' })
  buttonText: string;

  @Column({ type: 'jsonb', nullable: true })
  inputs: { type: string; placeholder: string; required?: boolean }[];

  @Column({ nullable: true })
  logoUrl?: string;

  @Column({ default: true })
  isActive: boolean;


  @Column({ unique: true, comment: 'Unique slug for public URL access' })
  slug: string;

  @Column({ unique: true, comment: 'Random public ID for sharing' })
  publicId: string;

  @BeforeInsert()
  generatePublicIdentifiers() {
    if (!this.slug) {
      // Generate slug from title
      this.slug = this.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') + '-' + shortUUID(6);
    }
    if (!this.publicId) {
      this.publicId = shortUUID(12);
    }
  }


  @Column({ default: false, comment: 'Require email verification before accepting lead' })
  requireEmailVerification: boolean;

  @Column({ default: false, comment: 'Enable CAPTCHA verification' })
  enableCaptcha: boolean;

  @Column({ default: true, comment: 'Send email notification on new lead' })
  sendEmailNotification: boolean;

  @Column({ nullable: true, comment: 'Custom success message after submission' })
  successMessage: string;

  @Column({ nullable: true, comment: 'Redirect URL after successful submission' })
  redirectUrl: string;

  @Column({ default: 0, comment: 'Total number of submissions received' })
  submissionCount: number;

  @Column({ default: 0, comment: 'Maximum submissions allowed (0 = unlimited)' })
  maxSubmissions: number;

  @Column({ type: 'jsonb', nullable: true, comment: 'Allowed domains for CORS (for embedded forms)' })
  allowedDomains: string[];

  @Column({ type: 'jsonb', nullable: true, comment: 'Custom styling for embedded form' })
  customStyling: {
    primaryColor?: string;
    fontFamily?: string;
    borderRadius?: string;
  };

  // ==================== RELATIONSHIPS ====================

  @ManyToOne(() => Business, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column({ nullable: false })
  businessId: number;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @Column({ nullable: false })
  createdBy: number;

  @OneToMany(() => Leads, (lead) => lead.form)
  leads: Leads[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;


  canAcceptSubmissions(): boolean {
    if (!this.isActive) return false;
    if (this.maxSubmissions === 0) return true;
    return this.submissionCount < this.maxSubmissions;
  }
}