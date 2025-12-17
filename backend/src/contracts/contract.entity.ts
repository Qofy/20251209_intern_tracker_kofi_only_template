import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('contracts')
export class Contract {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  student_email: string;

  @Column({ nullable: true })
  student_name: string;

  @Column()
  mentor_email: string;

  @Column({ nullable: true })
  mentor_name: string;

  @Column({ type: 'int', default: 600 })
  contract_hours: number;

  @Column({ type: 'date', nullable: true })
  start_date: string;

  @Column({ type: 'date', nullable: true })
  end_date: string;

  @Column({ type: 'text', nullable: true })
  terms: string; // Contract terms and conditions

  @Column({ type: 'text', nullable: true })
  student_signature: string;

  @Column({ type: 'date', nullable: true })
  student_signed_date: string;

  @Column({ type: 'text', nullable: true })
  mentor_signature: string;

  @Column({ type: 'date', nullable: true })
  mentor_signed_date: string;

  @Column({ default: 'draft' })
  status: string; // draft, student_review, mentor_review, pending_approval, approved, rejected

  @Column({ nullable: true })
  admin_notes: string;

  @Column({ nullable: true })
  rejection_reason: string;

  @Column({ nullable: true })
  company_id: number;

  @Column({ nullable: true })
  assigned_task_id: number; // Optional task assignment

  // Additional fields for placeholder replacement
  @Column({ type: 'text', nullable: true })
  work_area: string;

  @Column({ type: 'text', nullable: true })
  work_description: string;

  @Column({ nullable: true })
  weekly_hours: string;

  @Column({ nullable: true })
  company_name: string;

  @Column({ type: 'text', nullable: true })
  company_address: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
