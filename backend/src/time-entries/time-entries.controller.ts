import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TimeEntriesService } from './time-entries.service';
import { TimeEntry } from './time-entry.entity';

@Controller('time-entries')
@UseGuards(JwtAuthGuard)
export class TimeEntriesController {
  constructor(private timeEntriesService: TimeEntriesService) {}

  @Get()
  async findAll(@Query('student_id') studentId?: string, @Query('status') status?: string) {
    return this.timeEntriesService.findAll(studentId ? +studentId : undefined, status);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.timeEntriesService.findOne(+id);
  }

  @Post()
  async create(@Body() timeEntryData: Partial<TimeEntry>) {
    return this.timeEntriesService.create(timeEntryData);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() timeEntryData: Partial<TimeEntry>) {
    try {
      return await this.timeEntriesService.update(+id, timeEntryData);
    } catch (error) {
      console.error('TimeEntriesController update error:', error);
      throw error;
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.timeEntriesService.remove(+id);
  }
}
