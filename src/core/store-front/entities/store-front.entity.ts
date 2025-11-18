import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Business } from '../../businesses/business.entity';


@Entity('store-fronts')
export class StoreFront {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false, unique: true })
  businessId: number;

  @OneToOne(() => Business, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column({ nullable: false })
  coverImage: string;

  @Column({ nullable: false })
  storeName: string;

  @Column({ nullable: false })
  heroText: string;

  @Column({ nullable: false })
  storeColor: string;

  @Column('simple-array', { nullable: true })
  categoryName: string[];

  @Column('simple-array', { nullable: true })
  categoryImage: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}