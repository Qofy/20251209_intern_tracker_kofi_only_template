import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('vacancies')
export class Vacancy {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  type: string;

  @Column({ default: false })
  remote: boolean;

  @Column({ nullable: true })
  posted_by: string;

  @Column({ default: 'open' })
  status: string;

  @Column({ nullable: true })
  company_id: number;

  @Column({ nullable: true })
  company_name: string;

  @Column({ nullable: true })
  salary_min: number;

  @Column({ nullable: true })
  salary_max: number;

  @Column({ nullable: true })
  experience_level: string;

  @Column({ type: 'text', nullable: true })
  skills_required: string;

  @Column({ type: 'text', nullable: true })
  responsibilities: string;

  @Column({ type: 'text', nullable: true })
  requirements: string;

  @Column({ type: 'text', nullable: true })
  benefits: string;

  @Column({ nullable: true })
  application_deadline: Date;

  @Column({ default: 1 })
  positions_available: number;

  @Column({ nullable: true })
  department: string;

  @Column({ nullable: true })
  contact_email: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
