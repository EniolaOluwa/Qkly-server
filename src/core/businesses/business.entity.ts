import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { BusinessType } from './business-type.entity';
import { User } from '../users/entity/user.entity';

@Entity('businesses')
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

  @Column({ nullable: true })
  coverImage: string;

  @Column({ nullable: true }) // I'm guessing storename is the same as business name
  storeName: string;

  @Column({ nullable: true })
  heroText: string;

  @Column({ nullable: true })
  storeColor: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
