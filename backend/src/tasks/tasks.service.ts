import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './task.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
  ) {}

  async create(taskData: Partial<Task>): Promise<Task> {
    const task = this.tasksRepository.create(taskData);
    return this.tasksRepository.save(task);
  }

  async findAll(companyId: number, studentId?: number, mentorEmail?: string): Promise<Task[]> {
    const query: any = { company_id: companyId };
    if (studentId) query.student_id = studentId;
    if (mentorEmail) query.mentor_email = mentorEmail;
    return this.tasksRepository.find({ where: query, order: { due_date: 'ASC' } });
  }

  async findOne(id: number): Promise<Task> {
    return this.tasksRepository.findOne({ where: { id } });
  }

  async update(id: number, taskData: Partial<Task>): Promise<Task> {
    await this.tasksRepository.update(id, taskData);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.tasksRepository.delete(id);
  }
}
