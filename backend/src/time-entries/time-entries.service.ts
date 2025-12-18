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
    try {
      // Check if the time entry exists
      const existingEntry = await this.timeEntriesRepository.findOne({ where: { id } });
      if (!existingEntry) {
        throw new Error(`Time entry with id ${id} not found`);
      }

      await this.timeEntriesRepository.update(id, timeEntryData);
      return this.findOne(id);
    } catch (error) {
      console.error('Error updating time entry:', error);
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    await this.timeEntriesRepository.delete(id);
  }
}
