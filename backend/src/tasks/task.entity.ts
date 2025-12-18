import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: 'pending' })
  status: string; // pending, in_progress, completed

  @Column({ nullable: true })
  priority: string; // low, medium, high

  @Column({ type: 'date', nullable: true })
  due_date: string;

  @Column({ nullable: true })
  student_id: number;

  @Column({ nullable: true })
  assigned_by: string;

  @Column({ nullable: true })
  mentor_email: string;

  @Column({ nullable: true })
  company_id: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  hours_worked: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  estimated_hours: number;

  @Column({ type: 'int', default: 0 })
  progress_percentage: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
