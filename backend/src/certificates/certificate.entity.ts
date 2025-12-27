import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('certificates')
export class Certificate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  certificate_number: string;

  @Column()
  student_name: string;

  @Column({ nullable: true })
  student_email: string;

  @Column()
  company_name: string;

  @Column({ type: 'int' })
  total_hours: number;

  @Column({ type: 'date' })
  start_date: Date;

  @Column({ type: 'date' })
  end_date: Date;

  @Column({ type: 'text', nullable: true })
  tasks_description: string;

  @Column({ nullable: true })
  company_logo_url: string;

  @Column({ nullable: true })
  supervisor_name: string;

  @Column({ nullable: true })
  supervisor_title: string;

  @Column({ nullable: true })
  supervisor_signature_url: string;

  @Column({ nullable: true })
  company_id: number;

  @CreateDateColumn()
  created_date: Date;

  @UpdateDateColumn()
  last_updated: Date;
}
