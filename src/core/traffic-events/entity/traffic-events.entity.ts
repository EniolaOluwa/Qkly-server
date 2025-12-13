import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn, Index, OneToOne } from 'typeorm';
import { Business } from '../../businesses/business.entity';
import { User } from '../../users/entity/user.entity';
import { TrafficSource } from '../types/traffic-source.types';


@Entity('traffic_events')
@Index('IDX_TRAFFIC_BUSINESS_ID', ['businessId'])
@Index('IDX_TRAFFIC_CREATED_AT', ['createdAt'])
@Index('IDX_TRAFFIC_BUSINESS_CREATED', ['businessId', 'createdAt'])
@Index('IDX_TRAFFIC_BUSINESS_SOURCE', ['businessId', 'source'])
export class TrafficEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  businessId: number;

  @ManyToOne(() => Business, (business) => business.trafficEvents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column({ nullable: true })
  referralUrl?: string;

  @Column({ nullable: true })
  landingPage?: string;

  @Column({
    type: 'enum',
    enum: TrafficSource,
    default: TrafficSource.DIRECT,
  })
  source: TrafficSource;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true, type: 'text' })
  userAgent?: string;

  @CreateDateColumn()
  createdAt: Date;
}