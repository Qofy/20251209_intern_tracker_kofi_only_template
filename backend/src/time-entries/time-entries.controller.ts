import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TimeEntriesService } from './time-entries.service';
import { TimeEntry } from './time-entry.entity';

@Controller('time-entries')
@UseGuards(JwtAuthGuard)
export class TimeEntriesController {
  constructor(private timeEntriesService: TimeEntriesService) {}

  @Get()
  async findAll(@Request() req, @Query('student_id') studentId?: string, @Query('status') status?: string) {
    const companyId = req.user.company_id;
    return this.timeEntriesService.findAll(companyId, studentId ? +studentId : undefined, status);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.timeEntriesService.findOne(+id);
  }

  @Post()
  async create(@Request() req, @Body() timeEntryData: Partial<TimeEntry>) {
    const company_id = req.user.company_id;
    return this.timeEntriesService.create({ ...timeEntryData, company_id });
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
