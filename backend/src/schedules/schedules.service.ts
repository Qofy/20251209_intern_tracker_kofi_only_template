import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Schedule } from './schedule.entity';

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(Schedule)
    private schedulesRepository: Repository<Schedule>,
  ) {}

  async create(scheduleData: Partial<Schedule>): Promise<Schedule> {
    const schedule = this.schedulesRepository.create(scheduleData);
    return this.schedulesRepository.save(schedule);
  }

  async findAll(studentId?: number): Promise<Schedule[]> {
    const query: any = {};
    if (studentId) query.student_id = studentId;
    return this.schedulesRepository.find({ where: query, order: { date: 'ASC' } });
  }

  async findOne(id: number): Promise<Schedule> {
    return this.schedulesRepository.findOne({ where: { id } });
  }

  async update(id: number, scheduleData: Partial<Schedule>): Promise<Schedule> {
    await this.schedulesRepository.update(id, scheduleData);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.schedulesRepository.delete(id);
  }
}
