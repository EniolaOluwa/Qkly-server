import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';




export enum OtpType {
  EMAIL = 'email',
  PHONE = 'phone',
}



export enum OtpPurpose {
  PHONE_VERIFICATION = 'phone_verification',
  PASSWORD_RESET = 'password_reset',
  EMAIL_VERIFICATION = 'email_verification',
  PIN_CREATION = 'pin_creation',
}


@Entity('otps')
export class Otp {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ length: 50, nullable: false })
  otp: string;

  @Column({
    type: 'enum',
    enum: OtpType,
    nullable: false,
  })
  otpType: OtpType;

  @Column({
    type: 'enum',
    enum: OtpPurpose,
    default: OtpPurpose.PHONE_VERIFICATION,
    nullable: false,
  })
  purpose: OtpPurpose;

  @Column({ nullable: false })
  expiresAt: Date;

  @Column({ default: false })
  isUsed: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
