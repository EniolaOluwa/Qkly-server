import { User } from '../../users/entity/user.entity';
import {
  Entity,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LeadForm } from './leadForm.entity';
import { Business } from '../../businesses/business.entity';

@Entity({ name: 'leads' })
export class Leads {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  name: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  phone: string;

  @ManyToOne(() => LeadForm, (form) => form.leads, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'formId' })
  form: LeadForm;

  @Column({ nullable: false })
  formId: number;

  @ManyToOne(() => Business, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column({ nullable: false })
  businessId: number;

  @Column({ type: 'jsonb', nullable: true })
  formResponses: Record<string, any>;

  @Column({ nullable: true, comment: 'IP address of the submitter' })
  ipAddress: string;

  @Column({ type: 'text', nullable: true, comment: 'User agent string (browser/device info)' })
  userAgent: string;

  @Column({ nullable: true, comment: 'Referrer URL - where the user came from' })
  referrer: string;

  @Column({ type: 'jsonb', nullable: true, comment: 'UTM parameters for marketing attribution' })
  utmParameters: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };

  @Column({ nullable: true, comment: 'Country derived from IP' })
  country: string;

  @Column({ nullable: true, comment: 'City derived from IP' })
  city: string;

  @Column({ type: 'float', nullable: true, comment: 'Latitude from geolocation' })
  latitude: number;

  @Column({ type: 'float', nullable: true, comment: 'Longitude from geolocation' })
  longitude: number;

  @Column({ nullable: true, comment: 'Device type: mobile, tablet, desktop' })
  deviceType: string;

  @Column({ nullable: true, comment: 'Browser name' })
  browser: string;

  @Column({ nullable: true, comment: 'Operating system' })
  operatingSystem: string;

  @Column({ default: false, comment: 'Whether the lead has been contacted' })
  isContacted: boolean;

  @Column({ nullable: true, comment: 'Status: new, contacted, qualified, converted, lost' })
  status: string;

  @Column({ type: 'text', nullable: true, comment: 'Notes added by business owner' })
  notes: string;

  @Column({ type: 'jsonb', nullable: true, comment: 'Custom metadata' })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
