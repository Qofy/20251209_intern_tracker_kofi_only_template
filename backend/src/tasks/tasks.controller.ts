import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TasksService } from './tasks.service';
import { Task } from './task.entity';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get()
  async findAll(@Query('student_id') studentId?: string) {
    return this.tasksService.findAll(studentId ? +studentId : undefined);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.tasksService.findOne(+id);
  }

  @Post()
  async create(@Body() taskData: Partial<Task>) {
    return this.tasksService.create(taskData);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() taskData: Partial<Task>) {
    return this.tasksService.update(+id, taskData);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.tasksService.remove(+id);
  }
}
