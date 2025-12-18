import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  from_email: string;

  @Column()
  to_email: string;

  @Column()
  from_role: string; // 'Student' or 'Mentor'

  @Column()
  to_role: string; // 'Student', 'Mentor', or 'Admin'

  @Column()
  subject: string;

  @Column('text')
  content: string;

  @Column({ default: false })
  is_read: boolean;

  @Column({ nullable: true })
  student_id: number;

  @Column({ nullable: true })
  mentor_email: string;

  @Column({ nullable: true })
  company_id: number;

  @Column({ nullable: true })
  message_type: string; // 'message' or 'report'

  @Column({ type: 'text', nullable: true })
  report_data: string; // JSON string for report metadata

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}