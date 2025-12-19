import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TasksService } from './tasks.service';
import { Task } from './task.entity';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get()
  async findAll(@Request() req, @Query('student_id') studentId?: string, @Query('mentor_email') mentorEmail?: string) {
    const companyId = req.user.company_id;
    return this.tasksService.findAll(companyId, studentId ? +studentId : undefined, mentorEmail);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.tasksService.findOne(+id);
  }

  @Post()
  async create(@Request() req, @Body() taskData: Partial<Task>) {
    const company_id = req.user.company_id;
    return this.tasksService.create({ ...taskData, company_id });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() taskData: Partial<Task>) {
    try {
      const taskId = +id;
      if (isNaN(taskId)) {
        throw new Error('Invalid task ID');
      }
      
      console.log(`Updating task ${taskId} with data:`, taskData);
      
      return await this.tasksService.update(taskId, taskData);
    } catch (error) {
      console.error(`Error updating task ${id}:`, error);
      throw error;
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.tasksService.remove(+id);
  }
}
