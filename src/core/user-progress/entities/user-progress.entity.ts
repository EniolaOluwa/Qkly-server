import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users';

export enum UserProgressEvent {
  TRANSACTION_PIN_CREATED = 'TRANSACTION_PIN_CREATED',
  FIRST_PRODUCT_CREATED = 'FIRST_PRODUCT_CREATED',
  BUSINESS_INFO_UPDATED = 'BUSINESS_INFO_UPDATED',
  BUSINESS_LINK_SHARED = 'BUSINESS_LINK_SHARED',
}

@Entity('user_progress')
export class UserProgress {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @Column({
    type: 'enum',
    enum: UserProgressEvent,
    comment: 'Type of progress milestone'
  })
  event: UserProgressEvent;

  @CreateDateColumn()
  createdAt: Date;
}
