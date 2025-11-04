import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Business } from '../businesses/business.entity';
import { ProductSize } from './productSize.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  userId: number;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: false })
  businessId: number;

  @ManyToOne(() => Business, { nullable: false })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column('simple-array', { nullable: true, comment: 'Array of image URLs' })
  productImages: string[];

  @Column({ nullable: false })
  productName: string;

  @Column( 'text', { nullable: true })
  category: string; // suppose to be set of enum values 

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  price: number;

  @Column({ type: 'int', default: 0 })
  quantityInStock: number;

  @Column({ type: 'boolean', default: false, comment: 'Does this product include size or color variations?' })
  hasVariation: boolean;

  @Column('simple-array', { nullable: true })
  colors: string[];

  @OneToMany(() => ProductSize, size => size.product, { cascade: true })
  sizes: ProductSize[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}