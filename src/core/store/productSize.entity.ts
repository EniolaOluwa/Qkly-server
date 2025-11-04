import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Product } from './product.entity';
import { MeasurementType } from './dto/create-product.dto';

@Entity('product_sizes')
export class ProductSize {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Product, product => product.sizes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'enum', enum: MeasurementType })
  measurement: MeasurementType;

  @Column('simple-array')
  value: string[];

  @CreateDateColumn()
  createdAt: Date;
}
