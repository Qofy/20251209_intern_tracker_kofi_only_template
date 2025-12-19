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
    try {
      // Validate the task exists
      const existingTask = await this.findOne(id);
      if (!existingTask) {
        throw new Error(`Task with id ${id} not found`);
      }

      // Clean and validate the update data
      const cleanData: any = {};
      
      if (taskData.title !== undefined) cleanData.title = taskData.title;
      if (taskData.description !== undefined) cleanData.description = taskData.description;
      if (taskData.status !== undefined) cleanData.status = taskData.status;
      if (taskData.priority !== undefined) cleanData.priority = taskData.priority;
      if (taskData.due_date !== undefined) cleanData.due_date = taskData.due_date;
      if (taskData.student_id !== undefined) cleanData.student_id = taskData.student_id;
      if (taskData.assigned_by !== undefined) cleanData.assigned_by = taskData.assigned_by;
      if (taskData.mentor_email !== undefined) cleanData.mentor_email = taskData.mentor_email;
      if (taskData.company_id !== undefined) cleanData.company_id = taskData.company_id;
      
      // Handle numeric fields with validation
      if (taskData.hours_worked !== undefined) {
        const hours = parseFloat(taskData.hours_worked.toString());
        if (!isNaN(hours) && hours >= 0) {
          cleanData.hours_worked = hours;
        }
      }
      
      if (taskData.estimated_hours !== undefined) {
        const hours = parseFloat(taskData.estimated_hours.toString());
        if (!isNaN(hours) && hours >= 0) {
          cleanData.estimated_hours = hours;
        }
      }
      
      if (taskData.progress_percentage !== undefined) {
        const progress = parseInt(taskData.progress_percentage.toString());
        if (!isNaN(progress) && progress >= 0 && progress <= 100) {
          cleanData.progress_percentage = progress;
        }
      }

      console.log(`Updating task ${id} with data:`, cleanData);

      await this.tasksRepository.update(id, cleanData);
      return this.findOne(id);
    } catch (error) {
      console.error(`Error updating task ${id}:`, error);
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    await this.tasksRepository.delete(id);
  }
}
