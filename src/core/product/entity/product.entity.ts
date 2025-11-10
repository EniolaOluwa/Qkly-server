import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
  DeleteDateColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { Business } from '../../businesses/business.entity';
import { ProductSize } from './productSize.entity';
import { Category } from '../../category/entity/category.entity';

@Entity('products')
@Index(['userId', 'businessId'])
@Index(['createdAt'])
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  @Index()
  userId: number;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: false })
  @Index()
  businessId: number;

  @ManyToOne(() => Business, { nullable: false })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column('simple-array', { nullable: true, comment: 'Array of image URLs' })
  images: string[];

  @Column({ nullable: false })
  @Index()
  name: string;

  @ManyToOne(() => Category, { nullable: false })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column()
  @Index()
  categoryId: number;

  @Column('text', { nullable: false })
  description?: string

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  @Index()
  price: number;

  @Column({ type: 'int', default: 0 })
  @Index()
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

  @DeleteDateColumn()
  deletedAt: Date;
}