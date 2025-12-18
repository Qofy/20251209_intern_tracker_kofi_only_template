import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './message.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private messagesRepository: Repository<Message>,
  ) {}

  async sendMessage(messageData: {
    from_email: string;
    to_email: string;
    from_role: string;
    to_role: string;
    subject: string;
    content: string;
    student_id?: number;
    mentor_email?: string;
    message_type?: string;
    report_data?: string;
    company_id?: number;
  }): Promise<Message> {
    const message = this.messagesRepository.create(messageData);
    return this.messagesRepository.save(message);
  }

  async getMentorMessages(mentorEmail: string, companyId?: number): Promise<Message[]> {
    const whereConditions: any[] = [
      { to_email: mentorEmail },  // All messages TO this mentor (regardless of role)
      { from_email: mentorEmail } // All messages FROM this mentor
    ];
    
    if (companyId) {
      whereConditions.forEach(condition => condition.company_id = companyId);
    }
    
    return this.messagesRepository.find({ 
      where: whereConditions,
      order: { created_at: 'DESC' }
    });
  }

  async getStudentMessages(studentEmail: string, companyId?: number): Promise<Message[]> {
    const whereConditions: any[] = [
      { to_email: studentEmail },   // All messages TO this student
      { from_email: studentEmail } // All messages FROM this student
    ];
    
    if (companyId) {
      whereConditions.forEach(condition => condition.company_id = companyId);
    }
    
    return this.messagesRepository.find({ 
      where: whereConditions,
      order: { created_at: 'DESC' }
    });
  }

  async getConversation(email1: string, email2: string): Promise<Message[]> {
    return this.messagesRepository.find({
      where: [
        { from_email: email1, to_email: email2 },
        { from_email: email2, to_email: email1 }
      ],
      order: { created_at: 'ASC' }
    });
  }

  async markAsRead(messageId: number): Promise<Message> {
    await this.messagesRepository.update(messageId, { is_read: true });
    return this.messagesRepository.findOne({ where: { id: messageId } });
  }

  async markAllAsRead(userEmail: string): Promise<void> {
    await this.messagesRepository.update(
      { to_email: userEmail, is_read: false },
      { is_read: true }
    );
  }

  async getUnreadCount(userEmail: string): Promise<number> {
    return this.messagesRepository.count({
      where: { to_email: userEmail, is_read: false }
    });
  }

  async deleteMessage(messageId: number): Promise<void> {
    await this.messagesRepository.delete(messageId);
  }

  async getAdminMessages(adminEmail: string, companyId?: number): Promise<Message[]> {
    const whereConditions: any[] = [
      { to_email: adminEmail },   // All messages TO this admin
      { from_email: adminEmail }  // All messages FROM this admin
    ];
    
    if (companyId) {
      whereConditions.forEach(condition => condition.company_id = companyId);
    }
    
    return this.messagesRepository.find({ 
      where: whereConditions,
      order: { created_at: 'DESC' }
    });
  }

  async getAdminReports(adminEmail: string, companyId?: number): Promise<Message[]> {
    const whereCondition: any = { 
      to_email: adminEmail, 
      message_type: 'report' 
    };
    
    if (companyId) {
      whereCondition.company_id = companyId;
    }
    
    return this.messagesRepository.find({ 
      where: whereCondition,
      order: { created_at: 'DESC' }
    });
  }

  async replyToReport(reportId: number, replyContent: string, adminEmail: string): Promise<Message> {
    // Get the original report
    const report = await this.messagesRepository.findOne({ where: { id: reportId } });
    if (!report || !report.report_data) {
      throw new Error('Report not found');
    }

    const reportData = JSON.parse(report.report_data);
    
    // Create reply message to mentor
    const reply = this.messagesRepository.create({
      from_email: adminEmail,
      to_email: reportData.mentor_email,
      from_role: 'Admin',
      to_role: 'Mentor',
      subject: `Re: ${report.subject}`,
      content: replyContent,
      student_id: reportData.student_id,
      mentor_email: reportData.mentor_email,
      message_type: 'message',
      is_read: false
    });
    
    return this.messagesRepository.save(reply);
  }
}