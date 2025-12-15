import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SchedulesService } from './schedules.service';
import { Schedule } from './schedule.entity';

@Controller('schedules')
@UseGuards(JwtAuthGuard)
export class SchedulesController {
  constructor(private schedulesService: SchedulesService) {}

  @Get()
  async findAll(@Query('student_id') studentId?: string) {
    return this.schedulesService.findAll(studentId ? +studentId : undefined);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.schedulesService.findOne(+id);
  }

  @Post()
  async create(@Body() scheduleData: Partial<Schedule>) {
    return this.schedulesService.create(scheduleData);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() scheduleData: Partial<Schedule>) {
    return this.schedulesService.update(+id, scheduleData);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.schedulesService.remove(+id);
  }
}
