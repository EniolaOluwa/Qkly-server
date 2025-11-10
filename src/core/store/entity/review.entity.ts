import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { Product } from '../../product/entity/product.entity';
import { Business } from '../../businesses/business.entity';
import { OrderItem } from '../../order/entity/order-items.entity';
import { Order } from '../../order/entity/order.entity';
import { User } from '../../users';

@Entity('reviews')
export class Review {
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

  @Column({ nullable: false })
  @Index()
  productId: number;

  @ManyToOne(() => Product, { nullable: false })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ nullable: false })
  @Index()
  orderId: number;

  @ManyToOne(() => Order, { nullable: false })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ nullable: false })
  @Index()
  orderItemId: number;

  @ManyToOne(() => OrderItem, { nullable: false })
  @JoinColumn({ name: 'orderItemId' })
  orderItem: OrderItem;

  @Column({ type: 'text', nullable: false })
  review: string;

  @Column({
    type: 'int',
    nullable: false,
    comment: 'Rating between 1-5',
  })
  ratings: number;

  @Column({ type: 'simple-array', nullable: true, comment: 'Array of image URLs' })
  imageUrls: string[];

  @Column({ type: 'boolean', default: true })
  isVisible: boolean;

  @Column({ type: 'boolean', default: false })
  isVerifiedPurchase: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}