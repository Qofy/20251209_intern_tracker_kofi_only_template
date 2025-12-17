import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Company } from '../companies/company.entity';

export enum UserRole {
  ADMIN = 'admin',
  MENTOR = 'mentor',
  STUDENT = 'student',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  full_name: string;

  @Column({ default: 'student' })
  role: string;

  @Column({ nullable: true })
  company_id: number;

  @Column({ nullable: true })
  companyKey: string;

  @ManyToOne(() => Company, company => company.users, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
