import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('time_entries')
export class TimeEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  student_id: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ nullable: true })
  start_time: string;

  @Column({ nullable: true })
  end_time: string;

  @Column({ nullable: true })
  break_start: string;

  @Column({ nullable: true })
  break_end: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  approved_hours: number;

  @Column({ default: 'draft' })
  status: string; // draft, submitted, approved, rejected

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  created_by: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  manually_inputted_hours: number;

  @Column({ type: 'text', nullable: true })
  mentor_comments: string;

  @Column({ nullable: true })
  company_id: number;

  @Column({ type: 'json', nullable: true })
  proof_files: string[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
