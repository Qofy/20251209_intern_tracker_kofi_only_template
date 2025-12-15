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

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
