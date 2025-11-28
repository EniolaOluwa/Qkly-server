import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn, Index, OneToOne } from 'typeorm';
import { Business } from '../../businesses/business.entity';
import { User } from '../../users/entity/user.entity';




@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn()
  id: number;

   @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: false })
  userId: number;

  @Column({ nullable: true })
  deviceName: string;


  @Column({ nullable: true })
  osType: string;

  @Column({ nullable: true })
  osVersion: string;

  @Column({ nullable: true })
  deviceType: string;

  @Column({ nullable: true })
  referralUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
