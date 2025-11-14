import { User } from '../../users/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Leads } from './leads.entity';



@Entity({ name: 'lead-forms' })
export class LeadForm {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'button_text' })
  buttonText: string;

  @Column({ type: 'jsonb', nullable: true })
  inputs: { type: string; placeholder: string }[];

  @Column({ nullable: true })
  logoUrl?: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Leads, (lead) => lead.form)
  leads: Leads[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}