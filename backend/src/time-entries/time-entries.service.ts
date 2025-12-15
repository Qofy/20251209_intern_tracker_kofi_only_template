import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TimeEntry } from './time-entry.entity';

@Injectable()
export class TimeEntriesService {
  constructor(
    @InjectRepository(TimeEntry)
    private timeEntriesRepository: Repository<TimeEntry>,
  ) {}

  async create(timeEntryData: Partial<TimeEntry>): Promise<TimeEntry> {
    const timeEntry = this.timeEntriesRepository.create(timeEntryData);
    return this.timeEntriesRepository.save(timeEntry);
  }

  async findAll(studentId?: number, status?: string): Promise<TimeEntry[]> {
    const query: any = {};
    if (studentId) query.student_id = studentId;
    if (status) query.status = status;
    return this.timeEntriesRepository.find({ where: query, order: { date: 'DESC' } });
  }

  async findOne(id: number): Promise<TimeEntry> {
    return this.timeEntriesRepository.findOne({ where: { id } });
  }

  async update(id: number, timeEntryData: Partial<TimeEntry>): Promise<TimeEntry> {
    await this.timeEntriesRepository.update(id, timeEntryData);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.timeEntriesRepository.delete(id);
  }
}
