import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StudentsService } from './students.service';
import { Student } from './student.entity';

@Controller('students')
@UseGuards(JwtAuthGuard)
export class StudentsController {
  constructor(private studentsService: StudentsService) {}

  @Get()
  async findAll(@Request() req, @Query('mentor_email') mentorEmail?: string) {
    if (mentorEmail) {
      return this.studentsService.findByMentor(mentorEmail);
    }
    if (req.user.role === 'mentor') {
      return this.studentsService.findByMentor(req.user.email);
    }
    if (req.user.role === 'student') {
      const student = await this.studentsService.findByEmail(req.user.email);
      return student ? [student] : [];
    }
    return this.studentsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.studentsService.findOne(+id);
  }

  @Post()
  async create(@Body() studentData: Partial<Student>) {
    return this.studentsService.create(studentData);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() studentData: Partial<Student>) {
    return this.studentsService.update(+id, studentData);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.studentsService.remove(+id);
  }
}
