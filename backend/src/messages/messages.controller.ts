import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Request } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { Message } from './message.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  async sendMessage(
    @Body() messageData: {
      to_email: string;
      to_role: string;
      subject: string;
      content: string;
      student_id?: number;
      mentor_email?: string;
      message_type?: string;
      report_data?: string;
    },
    @Request() req
  ): Promise<Message> {
    const { user } = req;
    
    const messagePayload = {
      from_email: user.email,
      to_email: messageData.to_email,
      from_role: user.role,
      to_role: messageData.to_role,
      subject: messageData.subject,
      content: messageData.content,
      student_id: messageData.student_id,
      mentor_email: messageData.mentor_email,
      message_type: messageData.message_type || 'message',
      report_data: messageData.report_data,
      company_id: user.company_id
    };
    
    console.log('[Messages] Storing message:', messagePayload);
    
    return this.messagesService.sendMessage(messagePayload);
  }

  @Get('mentor')
  async getMentorMessages(@Request() req): Promise<Message[]> {
    const { user } = req;
    console.log('[Messages] getMentorMessages for user:', user.email, 'company:', user.company_id);
    const messages = await this.messagesService.getMentorMessages(user.email, user.company_id);
    console.log('[Messages] Found', messages.length, 'messages for mentor');
    messages.forEach((msg, index) => {
      console.log(`[Messages] Message ${index}: from="${msg.from_email}" to="${msg.to_email}" subject="${msg.subject}"`);
    });
    return messages;
  }

  @Get('student')
  async getStudentMessages(@Request() req): Promise<Message[]> {
    const { user } = req;
    return this.messagesService.getStudentMessages(user.email, user.company_id);
  }

  @Get('conversation/:otherEmail')
  async getConversation(
    @Param('otherEmail') otherEmail: string,
    @Request() req
  ): Promise<Message[]> {
    const { user } = req;
    return this.messagesService.getConversation(user.email, otherEmail);
  }

  @Put(':id/read')
  async markAsRead(@Param('id') id: number): Promise<Message> {
    return this.messagesService.markAsRead(id);
  }

  @Put('mark-all-read')
  async markAllAsRead(@Request() req): Promise<{ message: string }> {
    const { user } = req;
    await this.messagesService.markAllAsRead(user.email);
    return { message: 'All messages marked as read' };
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req): Promise<{ count: number }> {
    const { user } = req;
    const count = await this.messagesService.getUnreadCount(user.email);
    return { count };
  }

  @Delete(':id')
  async deleteMessage(@Param('id') id: number): Promise<{ message: string }> {
    await this.messagesService.deleteMessage(id);
    return { message: 'Message deleted successfully' };
  }

  @Get('admin')
  async getAdminMessages(@Request() req): Promise<Message[]> {
    const { user } = req;
    console.log('[Messages] getAdminMessages for user:', user.email, 'company:', user.company_id);
    const messages = await this.messagesService.getAdminMessages(user.email, user.company_id);
    console.log('[Messages] Found', messages.length, 'messages for admin');
    return messages;
  }

  @Get('admin/reports')
  async getAdminReports(@Request() req): Promise<Message[]> {
    const { user } = req;
    console.log('[Messages] getAdminReports for user:', user.email, 'company:', user.company_id);
    const reports = await this.messagesService.getAdminReports(user.email, user.company_id);
    console.log('[Messages] Found', reports.length, 'reports for admin');
    return reports;
  }

  @Post('report/:id/reply')
  async replyToReport(
    @Param('id') id: number,
    @Body() body: { content: string },
    @Request() req
  ): Promise<Message> {
    const { user } = req;
    console.log('[Messages] Admin replying to report:', id, 'from:', user.email);
    return this.messagesService.replyToReport(id, body.content, user.email);
  }
}