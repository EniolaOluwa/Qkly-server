import { User } from '../../users/user.entity';
import { Entity, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { LeadForm } from './leadForm.entity';



@Entity({ name: 'leads'})
export class Leads {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  name: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  phone: string;

  @ManyToOne(() => LeadForm, (form) => form.leads, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'formId' })
  form: LeadForm;

  @Column('uuid')
  formId: string;

  @CreateDateColumn()
  createdAt: Date;
}