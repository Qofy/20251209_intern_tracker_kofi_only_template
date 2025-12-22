import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('applications')
export class Application {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  applicant_email: string;

  @Column({ type: 'json', nullable: true })
  student_data: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  documents: Record<string, any>;

  @Column({ nullable: true })
  vacancy_id: number;

  @Column({ nullable: true })
  vacancy_title: string;

  @Column({ nullable: true })
  cover_letter: string;

  @Column({ default: 'submitted' })
  status: string; // submitted, approved, rejected

  @Column({ nullable: true })
  assigned_mentor_email: string;

  @Column({ nullable: true })
  approved_by: string;

  @Column({ nullable: true })
  approval_notes: string;

  @Column({ nullable: true })
  company_id: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
