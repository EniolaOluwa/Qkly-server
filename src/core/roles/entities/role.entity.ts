import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { UserType } from '../../../common/auth/user-role.enum';
import { User } from '../../users';

export enum RoleStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: false })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: UserType,
    nullable: false,
    comment: 'Determines if this role is for users or administrative staff',
  })
  userType: UserType;

  @Column({
    type: 'simple-array',
    nullable: true,
    comment: 'Array of permission strings',
  })
  permissions: string[];

  @Column({
    type: 'enum',
    enum: RoleStatus,
    default: RoleStatus.ACTIVE,
  })
  status: RoleStatus;

  @Column({ default: false, comment: 'System roles cannot be deleted' })
  isSystemRole: boolean;

  @OneToMany(() => User, (user) => user.role)
  users: User[];

  @Column({ default: 0, comment: 'Higher priority = more privileges' })
  priority: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  createdBy: number;

  @Column({ nullable: true })
  updatedBy: number;
}
