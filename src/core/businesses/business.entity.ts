import { TrafficEvent } from './../device/entity/device.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  OneToMany,
  BeforeInsert,
  BeforeUpdate,
  Index,
} from 'typeorm';
import { BusinessType } from './business-type.entity';
import { User } from '../users/entity/user.entity';
import slugify from 'slugify';



@Entity('businesses')
@Index('IDX_business_storeName', ['storeName'])
@Index('IDX_business_slug', ['slug'])
export class Business {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  businessName: string;

  @ManyToOne(() => BusinessType, { nullable: false })
  @JoinColumn({ name: 'businessTypeId' })
  businessType: BusinessType;

  @Column({ nullable: false })
  businessTypeId: number;

  @Column({ nullable: true })
  businessDescription: string;

  @Column({ nullable: false })
  location: string;

  @Column({ nullable: true })
  logo: string;

  @Column({ nullable: false, unique: true })
  userId: number;

  @OneToOne(() => User, (user) => user.business, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => TrafficEvent, (trafficEvent) => trafficEvent.business)
  trafficEvents: TrafficEvent[];

  @Column({ nullable: true })
  coverImage: string;

  @Column({ nullable: true, unique: true })
  storeName: string;

  @Column({ nullable: true, unique: true })
  slug: string;


  @Column({ nullable: true })
  heroText: string;

  @Column({ nullable: true })
  storeColor: string;

  @Column({ nullable: true, comment: 'Paystack subaccount code for split payments' })
  paystackSubaccountCode: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 95.00, comment: 'Percentage business receives from sales (100 - platform fee)' })
  revenueSharePercentage: number;

  @Column({ type: 'boolean', default: false, comment: 'Whether subaccount is verified and active' })
  isSubaccountActive: boolean;

  @Column({ nullable: true, comment: 'Settlement schedule for this business' })
  settlementSchedule: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;


  @BeforeInsert()
  @BeforeUpdate()
  generateSlug() {
    if (!this.slug && this.storeName) {
      this.slug = slugify(this.storeName, { lower: true, strict: true, trim: true });
    }
  }
}
