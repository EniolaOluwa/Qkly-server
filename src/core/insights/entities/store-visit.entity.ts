import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Business } from '../../businesses/business.entity';

@Entity('store_visits')
@Index(['businessId', 'createdAt'])
@Index(['trafficSource'])
export class StoreVisit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  @Index()
  businessId: number;

  @ManyToOne(() => Business, { nullable: false })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column({ nullable: true })
  @Index()
  trafficSource: string; // 'instagram', 'facebook', 'twitter', 'google', 'tiktok', 'direct', 'others'

  @Column({ nullable: true })
  referrer: string; // Full referrer URL

  @Column({ nullable: true })
  utmSource: string; // UTM source parameter

  @Column({ nullable: true })
  utmMedium: string; // UTM medium parameter

  @Column({ nullable: true })
  utmCampaign: string; // UTM campaign parameter

  @Column({ nullable: true })
  userAgent: string; // Browser/device info

  @Column({ nullable: true })
  ipAddress: string; // Visitor IP (for analytics, consider privacy)

  @Column({ nullable: true })
  sessionId: string; // To track unique sessions

  @CreateDateColumn()
  createdAt: Date;
}

