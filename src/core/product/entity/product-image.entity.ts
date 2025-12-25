import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Product } from './product.entity';

/**
 * ProductImage Entity - Product photos
 *
 * Purpose:
 * - Store multiple images per product
 * - Define display order (sortOrder)
 * - Track primary image (for thumbnails, listings)
 * - Store Cloudinary URLs and metadata
 */
@Entity('product_images')
@Index(['productId', 'sortOrder'])
@Index(['isPrimary'])
export class ProductImage {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Parent product ID
   */
  @Column()
  productId: number;

  @ManyToOne(() => Product, (product) => product.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  /**
   * Image URL (Cloudinary)
   * Full resolution
   */
  @Column({ type: 'text' })
  imageUrl: string;

  /**
   * Thumbnail URL (optimized, small)
   * For product listings, grids
   */
  @Column({ type: 'text', nullable: true })
  thumbnailUrl: string;

  /**
   * Alt text (for SEO, accessibility)
   */
  @Column({ length: 255, nullable: true })
  altText: string;

  /**
   * Display order (0 = first image, 1 = second, etc.)
   * First image used as primary thumbnail
   */
  @Column({ type: 'smallint', default: 0 })
  sortOrder: number;

  /**
   * Is this the primary image?
   * Only one primary per product
   */
  @Column({ default: false })
  isPrimary: boolean;

  /**
   * Cloudinary public ID (for deletion)
   */
  @Column({ length: 255, nullable: true })
  cloudinaryPublicId: string;

  /**
   * Image metadata (width, height, format, size)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    width?: number;
    height?: number;
    format?: string;
    sizeBytes?: number;
  };

  @CreateDateColumn()
  createdAt: Date;
}
