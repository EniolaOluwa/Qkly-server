import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ConfigDataType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  JSON = 'JSON',
}

@Entity('system_configs')
export class SystemConfig {
  @PrimaryColumn()
  key: string;

  @Column({ type: 'text' })
  value: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ConfigDataType,
    default: ConfigDataType.STRING,
  })
  dataType: ConfigDataType;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
